-- Adds a second content-creation path alongside the existing manual
-- Template Engine: "poster_upload" — a designer-finished poster image
-- uploaded as-is, with a minimal title/category/poster form instead of the
-- full per-template field set. Reuses cms_content_items (same status/review
-- workflow, same RLS shape) rather than a parallel content system —
-- template_type becomes nullable (poster_upload rows have no template) and
-- a CHECK constraint keeps the two modes from mixing up their invariants.
--
-- estimated_seconds (existing column) is reused for the poster form's
-- optional "预计阅读时间" instead of adding a second, near-duplicate
-- "estimated_reading_seconds" column — one reading-time concept per row.

alter table public.cms_content_items
  alter column template_type drop not null;

alter table public.cms_content_items
  add column content_creation_mode text not null default 'template' check (content_creation_mode in ('template', 'poster_upload')),
  add column poster_description text,
  add column poster_alt_text text,
  add column internal_note text;

alter table public.cms_content_items
  add constraint cms_content_items_template_type_by_mode check (
    (content_creation_mode = 'template' and template_type is not null)
    or (content_creation_mode = 'poster_upload' and template_type is null)
  );

-- One content item can have one or more poster images (carousel, up to 5 in
-- the UI). media_type is a single value for now ('poster_image') but kept
-- as its own column — same "one value now, extend later" shape as every
-- other categorical column in this schema.
create table public.cms_content_media (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.cms_content_items (id) on delete cascade,
  media_type text not null default 'poster_image' check (media_type in ('poster_image')),
  file_url text not null,
  sort_order integer not null default 0,
  width integer,
  height integer,
  aspect_ratio text,
  file_size integer,
  created_at timestamptz not null default now()
);

create index cms_content_media_content_idx on public.cms_content_media (content_id, sort_order);

alter table public.cms_content_media enable row level security;

-- Delegates entirely to cms_content_items' own SELECT policies: RLS on the
-- referenced table is applied when evaluated inside this subquery, so a
-- poster's media rows are visible exactly when their parent content row is
-- (staff see everything; customers only published + scheduled).
create policy "cms_content_media_select" on public.cms_content_media
  for select using (content_id in (select id from public.cms_content_items));

create policy "cms_content_media_insert_owner_or_admin" on public.cms_content_media
  for insert
  with check (
    exists (
      select 1 from public.cms_content_items c
      where c.id = content_id
        and (c.created_by = auth.uid() or public.current_role() = 'admin')
    )
  );

create policy "cms_content_media_delete_owner_or_admin" on public.cms_content_media
  for delete
  using (
    exists (
      select 1 from public.cms_content_items c
      where c.id = content_id
        and (c.created_by = auth.uid() or public.current_role() = 'admin')
    )
  );

revoke all on public.cms_content_media from anon;

-- Poster images reuse the existing public cms-content-images bucket
-- (already admin/nutritionist/trainer-write, public-read) — just raise the
-- per-file limit from 5MB to the poster spec's 10MB.
update storage.buckets set file_size_limit = 10485760 where id = 'cms-content-images';

-- ---------- get_my_today_content(): also return the new mode/poster
-- fields and an aggregated poster_media array so the customer-facing
-- viewer can render a poster without a second round trip. The column set
-- changed, so the old signature must be dropped first (same as any other
-- RETURNS TABLE shape change in Postgres).
drop function public.get_my_today_content();

create function public.get_my_today_content()
returns table(
  content_id uuid, title text, category cms_content_category, template_type cms_template_type,
  fields jsonb, cover_image_url text, estimated_seconds integer, position_in_day integer,
  total_today integer, completed boolean,
  content_creation_mode text, poster_description text, poster_alt_text text, poster_media jsonb
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_day integer;
  v_enabled boolean;
  v_limit integer;
begin
  select daily_content_enabled, daily_content_limit into v_enabled, v_limit
  from public.cms_journey_settings where id = '00000000-0000-0000-0000-000000000001'::uuid;

  if not coalesce(v_enabled, true) then
    return;
  end if;

  v_day := public.customer_current_journey_day(v_customer_id);

  return query
    with today_items as (
      select c.id, c.title, c.category, c.template_type, c.fields, c.cover_image_url, c.estimated_seconds,
             c.content_creation_mode, c.poster_description, c.poster_alt_text,
             row_number() over (order by s.sort_order) as position_in_day
      from public.cms_journey_schedule s
      join public.cms_content_items c on c.id = s.content_id and c.status = 'published'
      where s.day_number = v_day
      order by s.sort_order
      limit v_limit
    )
    select
      t.id, t.title, t.category, t.template_type, t.fields, t.cover_image_url, t.estimated_seconds,
      t.position_in_day::integer,
      (select count(*) from today_items)::integer as total_today,
      exists(
        select 1 from public.cms_customer_content_progress p
        where p.customer_id = v_customer_id and p.day_number = v_day and p.content_id = t.id
      ) as completed,
      t.content_creation_mode,
      t.poster_description,
      t.poster_alt_text,
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', m.id, 'fileUrl', m.file_url, 'sortOrder', m.sort_order,
                 'width', m.width, 'height', m.height, 'aspectRatio', m.aspect_ratio, 'fileSize', m.file_size
               ) order by m.sort_order)
        from public.cms_content_media m where m.content_id = t.id
      ), '[]'::jsonb) as poster_media
    from today_items t;
end;
$$;

-- DROP FUNCTION wipes any prior grants — Postgres grants EXECUTE to PUBLIC
-- on a freshly created function by default, so this must be redone exactly
-- like the original migration's grant.
revoke execute on function public.get_my_today_content() from anon;
grant execute on function public.get_my_today_content() to authenticated;

-- ---------- submit_content_for_review(): poster_upload content is validated
-- against its own minimal rule (must have at least one poster image) instead
-- of the manual Template Engine's per-field validation, which never applies
-- to it (no product name / quiz answers / challenge condition to check).
create or replace function public.submit_content_for_review(p_content_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_creator uuid;
  v_status public.cms_content_status;
  v_mode text;
  v_action text;
begin
  select created_by, status, content_creation_mode into v_creator, v_status, v_mode from public.cms_content_items where id = p_content_id;
  if v_creator is null then
    raise exception '内容不存在';
  end if;
  if v_creator <> auth.uid() then
    raise exception '只能提交自己建立的内容';
  end if;
  if v_status not in ('draft', 'needs_revision') then
    raise exception '目前状态无法提交审核';
  end if;
  if v_mode = 'poster_upload' and not exists (select 1 from public.cms_content_media where content_id = p_content_id) then
    raise exception '请至少上传一张海报图片才能提交审核';
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

-- ---------- create_revision_draft(): also copy the poster fields and the
-- poster_media rows themselves — otherwise a poster's "modify draft" would
-- silently lose its images.
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

  insert into public.cms_content_items
    (title, category, template_type, fields, cover_image_url, estimated_seconds, status, created_by, updated_by,
     parent_content_id, content_version, content_creation_mode, poster_description, poster_alt_text, internal_note)
  select title, category, template_type, fields, cover_image_url, estimated_seconds, 'draft', auth.uid(), auth.uid(),
         id, content_version + 1, content_creation_mode, poster_description, poster_alt_text, internal_note
  from public.cms_content_items
  where id = p_content_id
  returning id into v_new_id;

  insert into public.cms_content_media (content_id, media_type, file_url, sort_order, width, height, aspect_ratio, file_size)
  select v_new_id, media_type, file_url, sort_order, width, height, aspect_ratio, file_size
  from public.cms_content_media
  where content_id = p_content_id;

  return v_new_id;
end;
$$;
