-- Completes the review/publish workflow: audit fields, a review-history
-- table, a revision-draft path for editing already-published content
-- without overwriting what customers currently see, and RLS hardened so
-- published rows can never be edited directly (even by Admin) — only
-- through unpublish or create_revision_draft.

alter table public.cms_content_items
  rename column rejection_reason to review_note;

alter table public.cms_content_items
  add column submitted_for_review_at timestamptz,
  add column submitted_for_review_by uuid references public.profiles (id),
  add column published_by uuid references public.profiles (id),
  add column content_version integer not null default 1,
  add column parent_content_id uuid references public.cms_content_items (id),
  add column updated_by uuid references public.profiles (id);

create table public.cms_content_reviews (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.cms_content_items (id) on delete cascade,
  action text not null check (action in ('submitted', 'rejected', 'resubmitted', 'published', 'unpublished')),
  from_status public.cms_content_status,
  to_status public.cms_content_status,
  reviewer_id uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index cms_content_reviews_content_idx on public.cms_content_reviews (content_id, created_at desc);

alter table public.cms_content_reviews enable row level security;

create policy "cms_reviews_select_staff" on public.cms_content_reviews
  for select using (public.current_role() in ('admin', 'nutritionist', 'trainer'));

-- Writes only via the SECURITY DEFINER functions below (they bypass RLS as
-- the function owner) — same "no direct client write" pattern as
-- cms_customer_content_progress.
revoke insert, update, delete on public.cms_content_reviews from anon, authenticated;
revoke all on public.cms_content_reviews from anon;

-- ---------- Harden the owner/admin UPDATE policy: published is off-limits
-- to direct field edits for EVERYONE, including Admin — the only paths
-- into/out of published are set_content_published() (unpublish) and
-- create_revision_draft() (edit via a new draft), both SECURITY DEFINER.
drop policy "cms_content_update_owner_or_admin" on public.cms_content_items;
create policy "cms_content_update_owner_or_admin" on public.cms_content_items
  for update
  using (
    (created_by = auth.uid() and status in ('draft', 'needs_revision') and public.current_role() in ('nutritionist', 'trainer'))
    or (public.current_role() = 'admin' and status in ('draft', 'pending_review', 'needs_revision'))
  )
  with check (
    (created_by = auth.uid() and public.current_role() in ('nutritionist', 'trainer'))
    or (public.current_role() = 'admin' and status in ('draft', 'pending_review', 'needs_revision'))
  );

-- ---------- submit_content_for_review(): now admin-eligible too (any
-- creator submitting their own content, matching the RLS insert policy
-- which already allows admin as a creator role), stamps submission
-- metadata, and logs to cms_content_reviews.
create or replace function public.submit_content_for_review(p_content_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_creator uuid;
  v_status public.cms_content_status;
  v_action text;
begin
  select created_by, status into v_creator, v_status from public.cms_content_items where id = p_content_id;
  if v_creator is null then
    raise exception '内容不存在';
  end if;
  if v_creator <> auth.uid() then
    raise exception '只能提交自己建立的内容';
  end if;
  if v_status not in ('draft', 'needs_revision') then
    raise exception '目前状态无法提交审核';
  end if;

  v_action := case when v_status = 'needs_revision' then 'resubmitted' else 'submitted' end;

  update public.cms_content_items
  set status = 'pending_review',
      review_note = null,
      submitted_for_review_at = now(),
      submitted_for_review_by = auth.uid(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_content_id;

  insert into public.cms_content_reviews (content_id, action, from_status, to_status, reviewer_id, note)
  values (p_content_id, v_action, v_status, 'pending_review', auth.uid(), null);
end;
$$;

-- ---------- review_content(): approve now also stamps published_by, logs
-- to cms_content_reviews, and — when the item is a revision draft
-- (parent_content_id set) — supersedes the parent (status=unpublished) and
-- re-points its Journey schedule entries onto the new version so the slot
-- keeps showing content without Admin having to reschedule by hand.
create or replace function public.review_content(p_content_id uuid, p_approve boolean, p_review_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_status public.cms_content_status;
  v_parent_id uuid;
begin
  if public.current_role() <> 'admin' then
    raise exception '只有 Admin 可以审核内容';
  end if;

  select status, parent_content_id into v_status, v_parent_id from public.cms_content_items where id = p_content_id;
  if v_status is null then
    raise exception '内容不存在';
  end if;
  if v_status <> 'pending_review' then
    raise exception '这篇内容目前不在待审核状态';
  end if;

  if p_approve then
    update public.cms_content_items
    set status = 'published',
        published_at = now(),
        published_by = auth.uid(),
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = null,
        updated_by = auth.uid(),
        updated_at = now()
    where id = p_content_id;

    insert into public.cms_content_reviews (content_id, action, from_status, to_status, reviewer_id, note)
    values (p_content_id, 'published', 'pending_review', 'published', auth.uid(), null);

    if v_parent_id is not null then
      update public.cms_content_items
      set status = 'unpublished', unpublished_at = now(), updated_by = auth.uid(), updated_at = now()
      where id = v_parent_id and status = 'published';

      update public.cms_journey_schedule
      set content_id = p_content_id
      where content_id = v_parent_id;

      insert into public.cms_content_reviews (content_id, action, from_status, to_status, reviewer_id, note)
      values (v_parent_id, 'unpublished', 'published', 'unpublished', auth.uid(), '已被修改草稿取代');
    end if;
  else
    if p_review_note is null or length(trim(p_review_note)) = 0 then
      raise exception '退回修改必须填写原因';
    end if;
    update public.cms_content_items
    set status = 'needs_revision',
        review_note = p_review_note,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_by = auth.uid(),
        updated_at = now()
    where id = p_content_id;

    insert into public.cms_content_reviews (content_id, action, from_status, to_status, reviewer_id, note)
    values (p_content_id, 'rejected', 'pending_review', 'needs_revision', auth.uid(), p_review_note);
  end if;
end;
$$;

-- ---------- set_content_published(): re-publish/unpublish now also stamp
-- published_by and log to cms_content_reviews.
create or replace function public.set_content_published(p_content_id uuid, p_published boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_status public.cms_content_status;
begin
  if public.current_role() <> 'admin' then
    raise exception '只有 Admin 可以发布或取消发布内容';
  end if;

  select status into v_status from public.cms_content_items where id = p_content_id;
  if v_status is null then
    raise exception '内容不存在';
  end if;

  if p_published then
    if v_status not in ('unpublished', 'published') then
      raise exception '只有已发布或已取消发布的内容可以用这个操作重新上线';
    end if;
    update public.cms_content_items
    set status = 'published', published_at = now(), published_by = auth.uid(), unpublished_at = null, updated_by = auth.uid(), updated_at = now()
    where id = p_content_id;
    insert into public.cms_content_reviews (content_id, action, from_status, to_status, reviewer_id, note)
    values (p_content_id, 'published', 'unpublished', 'published', auth.uid(), null);
  else
    if v_status <> 'published' then
      raise exception '这篇内容目前不是已发布状态';
    end if;
    update public.cms_content_items
    set status = 'unpublished', unpublished_at = now(), updated_by = auth.uid(), updated_at = now()
    where id = p_content_id;
    insert into public.cms_content_reviews (content_id, action, from_status, to_status, reviewer_id, note)
    values (p_content_id, 'unpublished', 'published', 'unpublished', auth.uid(), null);
  end if;
end;
$$;

-- ---------- create_revision_draft(): the only way to "edit" published
-- content — clones it into a new draft rather than mutating the live row,
-- so customers mid-Journey never see a half-edited version. Admin-only,
-- matching that Nutritionist/Trainer already have no path to touch a
-- published row (canEdit never bypasses status for them).
create or replace function public.create_revision_draft(p_content_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_new_id uuid;
  v_status public.cms_content_status;
begin
  if public.current_role() <> 'admin' then
    raise exception '只有 Admin 可以建立修改草稿';
  end if;

  select status into v_status from public.cms_content_items where id = p_content_id;
  if v_status is null then
    raise exception '内容不存在';
  end if;
  if v_status <> 'published' then
    raise exception '只有已发布的内容需要建立修改草稿';
  end if;

  -- created_by is the admin who initiated this, not the original author —
  -- otherwise the admin couldn't submit their own revision draft, since
  -- submit_content_for_review() requires created_by = auth.uid().
  insert into public.cms_content_items
    (title, category, template_type, fields, cover_image_url, estimated_seconds, status, created_by, updated_by, parent_content_id, content_version)
  select title, category, template_type, fields, cover_image_url, estimated_seconds, 'draft', auth.uid(), auth.uid(), id, content_version + 1
  from public.cms_content_items
  where id = p_content_id
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke execute on function public.create_revision_draft(uuid) from anon;
grant execute on function public.create_revision_draft(uuid) to authenticated;

-- review_content()'s signature changed (p_rejection_reason -> p_review_note)
-- — re-grant since create or replace with a renamed param is still the same
-- overload, but do it explicitly for clarity.
revoke execute on function public.review_content(uuid, boolean, text) from anon;
grant execute on function public.review_content(uuid, boolean, text) to authenticated;
