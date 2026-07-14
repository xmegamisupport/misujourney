-- ---------- Knowledge CMS V1 ----------
-- "每天一分钟的小知识" — not a blog/course system. See AGENTS session notes
-- for the full spec. Everything here follows the existing app's
-- writes-go-through-RPCs / RLS-not-just-hidden-buttons conventions.

create type public.cms_content_category as enum ('nutrition_knowledge', 'life_tips', 'misu_usage', 'daily_challenge');

create type public.cms_template_type as enum (
  'image_knowledge',
  'supermarket_pick',
  'eating_out_guide',
  'product_tutorial',
  'quiz',
  'true_false',
  'daily_challenge'
);

create type public.cms_content_status as enum ('draft', 'pending_review', 'published', 'rejected', 'unpublished');

-- ---------- Content Library ----------
-- Each item stands alone (not "Day 1/Day 2") and can be scheduled onto any
-- number of days via cms_journey_schedule below. `fields` holds the
-- template-specific structured data (the Template Engine's field
-- definitions live in TypeScript, src/lib/cms/templates.ts — Designer
-- supplies the visual template later, this just stores the content).
create table public.cms_content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category public.cms_content_category not null,
  template_type public.cms_template_type not null,
  fields jsonb not null default '{}'::jsonb,
  cover_image_url text,
  estimated_seconds integer not null default 45 check (estimated_seconds > 0 and estimated_seconds <= 90),
  status public.cms_content_status not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete cascade,
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  published_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cms_content_items_status_idx on public.cms_content_items (status);
create index cms_content_items_created_by_idx on public.cms_content_items (created_by);

-- ---------- Journey settings (singleton) ----------
-- "第一版默认每天只显示1篇内容" but Admin can raise it to 2/3 — never
-- hardcoded on the frontend, always read from here.
create table public.cms_journey_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  journey_name text not null default 'MISU Journey',
  journey_days integer not null default 30 check (journey_days > 0),
  daily_content_limit integer not null default 1 check (daily_content_limit in (1, 2, 3)),
  daily_content_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint cms_journey_settings_singleton check (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

insert into public.cms_journey_settings (id) values ('00000000-0000-0000-0000-000000000001'::uuid);

-- ---------- Journey schedule: which content shows on which relative day ----------
-- day_number is relative to each customer's own Journey start (their
-- current_journey_day, computed below), not a calendar date — everyone on
-- the same day of their own Journey sees the same content.
create table public.cms_journey_schedule (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null check (day_number >= 1),
  content_id uuid not null references public.cms_content_items (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (day_number, content_id)
);

create index cms_journey_schedule_day_idx on public.cms_journey_schedule (day_number, sort_order);

-- ---------- Per-customer completion, snapshotted so a later schedule/content
-- edit never rewrites what a customer already saw ----------
create table public.cms_customer_content_progress (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  day_number integer not null,
  content_id uuid not null references public.cms_content_items (id),
  content_title_snapshot text not null,
  template_type_snapshot public.cms_template_type not null,
  completed_at timestamptz not null default now(),
  unique (customer_id, day_number, content_id)
);

create index cms_progress_customer_idx on public.cms_customer_content_progress (customer_id, completed_at desc);

-- ---------- RLS ----------
alter table public.cms_content_items enable row level security;
alter table public.cms_journey_settings enable row level security;
alter table public.cms_journey_schedule enable row level security;
alter table public.cms_customer_content_progress enable row level security;

-- Content Library: every CMS role can read the whole library (it's a shared
-- pool, not per-author silos) — only writes are restricted.
create policy "cms_content_select_staff" on public.cms_content_items
  for select using (public.current_role() in ('admin', 'nutritionist', 'trainer', 'coach'));

-- Customers need to read *published* content that's actually scheduled to
-- them — narrow policy, no path to draft/pending/rejected/unpublished items
-- or to content not on their schedule.
create policy "cms_content_select_customer_published_scheduled" on public.cms_content_items
  for select using (
    status = 'published'
    and public.current_role() = 'customer'
    and id in (select content_id from public.cms_journey_schedule)
  );

create policy "cms_content_insert_creator" on public.cms_content_items
  for insert with check (
    public.current_role() in ('nutritionist', 'trainer', 'admin')
    and created_by = auth.uid()
  );

-- Creator can keep editing their own content while it hasn't gone past
-- draft/rejected; Admin can edit anything at any status (including
-- published/pending — status transitions themselves go through the RPCs
-- below, but Admin fixing a typo on a live item doesn't need to unpublish
-- first).
create policy "cms_content_update_owner_or_admin" on public.cms_content_items
  for update
  using (
    (created_by = auth.uid() and status in ('draft', 'rejected') and public.current_role() in ('nutritionist', 'trainer'))
    or public.current_role() = 'admin'
  )
  with check (
    (created_by = auth.uid() and public.current_role() in ('nutritionist', 'trainer'))
    or public.current_role() = 'admin'
  );

revoke truncate, delete on public.cms_content_items from anon, authenticated;
revoke all on public.cms_content_items from anon;

create policy "cms_journey_settings_select_staff" on public.cms_journey_settings
  for select using (public.current_role() in ('admin', 'nutritionist', 'trainer', 'coach'));

revoke truncate, insert, update, delete on public.cms_journey_settings from anon, authenticated;
revoke all on public.cms_journey_settings from anon;

create policy "cms_journey_schedule_select_staff" on public.cms_journey_schedule
  for select using (public.current_role() in ('admin', 'nutritionist', 'trainer', 'coach'));

create policy "cms_journey_schedule_write_admin" on public.cms_journey_schedule
  for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

revoke truncate on public.cms_journey_schedule from anon, authenticated;
revoke all on public.cms_journey_schedule from anon;

create policy "cms_progress_select_own" on public.cms_customer_content_progress
  for select using (customer_id = auth.uid());

create policy "cms_progress_select_as_admin" on public.cms_customer_content_progress
  for select using (public.current_role() = 'admin');

-- Writes only via complete_today_content() below (SECURITY DEFINER) — no
-- direct insert/update/delete grant, same pattern as record_meal etc.
revoke truncate, insert, update, delete on public.cms_customer_content_progress from anon, authenticated;
revoke all on public.cms_customer_content_progress from anon;

-- ---------- current Journey day (relative, 4am-boundary-aware) ----------
create or replace function public.customer_current_journey_day(p_customer_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(
    1,
    (public.customer_journey_date(p_customer_id) - coalesce((select start_date from public.profiles where id = p_customer_id), public.customer_journey_date(p_customer_id))) + 1
  );
$$;

revoke execute on function public.customer_current_journey_day(uuid) from anon;
grant execute on function public.customer_current_journey_day(uuid) to authenticated;

-- ---------- Review workflow ----------
create or replace function public.submit_content_for_review(p_content_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_creator uuid;
  v_status public.cms_content_status;
begin
  select created_by, status into v_creator, v_status from public.cms_content_items where id = p_content_id;
  if v_creator is null then
    raise exception '内容不存在';
  end if;
  if v_creator <> auth.uid() then
    raise exception '只能提交自己建立的内容';
  end if;
  if v_status not in ('draft', 'rejected') then
    raise exception '目前状态无法提交审核';
  end if;

  update public.cms_content_items
  set status = 'pending_review', rejection_reason = null, updated_at = now()
  where id = p_content_id;
end;
$$;

revoke execute on function public.submit_content_for_review(uuid) from anon;
grant execute on function public.submit_content_for_review(uuid) to authenticated;

create or replace function public.review_content(p_content_id uuid, p_approve boolean, p_rejection_reason text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_status public.cms_content_status;
begin
  if public.current_role() <> 'admin' then
    raise exception '只有 Admin 可以审核内容';
  end if;

  select status into v_status from public.cms_content_items where id = p_content_id;
  if v_status is null then
    raise exception '内容不存在';
  end if;
  if v_status <> 'pending_review' then
    raise exception '这篇内容目前不在待审核状态';
  end if;

  if p_approve then
    update public.cms_content_items
    set status = 'published', published_at = now(), reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = null, updated_at = now()
    where id = p_content_id;
  else
    if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
      raise exception '退回修改必须填写原因';
    end if;
    update public.cms_content_items
    set status = 'rejected', rejection_reason = p_rejection_reason, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    where id = p_content_id;
  end if;
end;
$$;

revoke execute on function public.review_content(uuid, boolean, text) from anon;
grant execute on function public.review_content(uuid, boolean, text) to authenticated;

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
    set status = 'published', published_at = now(), unpublished_at = null, updated_at = now()
    where id = p_content_id;
  else
    if v_status <> 'published' then
      raise exception '这篇内容目前不是已发布状态';
    end if;
    update public.cms_content_items
    set status = 'unpublished', unpublished_at = now(), updated_at = now()
    where id = p_content_id;
  end if;
end;
$$;

revoke execute on function public.set_content_published(uuid, boolean) from anon;
grant execute on function public.set_content_published(uuid, boolean) to authenticated;

-- ---------- Journey settings write (Admin only) ----------
create or replace function public.update_journey_settings(
  p_journey_name text,
  p_journey_days integer,
  p_daily_content_limit integer,
  p_daily_content_enabled boolean
) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if public.current_role() <> 'admin' then
    raise exception '只有 Admin 可以修改 Journey 设置';
  end if;
  if p_daily_content_limit not in (1, 2, 3) then
    raise exception '每日内容上限只能是 1、2 或 3';
  end if;
  if p_journey_days <= 0 then
    raise exception 'Journey 天数必须大于 0';
  end if;

  update public.cms_journey_settings
  set journey_name = p_journey_name,
      journey_days = p_journey_days,
      daily_content_limit = p_daily_content_limit,
      daily_content_enabled = p_daily_content_enabled,
      updated_at = now(),
      updated_by = auth.uid()
  where id = '00000000-0000-0000-0000-000000000001'::uuid;
end;
$$;

revoke execute on function public.update_journey_settings(text, integer, integer, boolean) from anon;
grant execute on function public.update_journey_settings(text, integer, integer, boolean) to authenticated;

-- ---------- Journey schedule write (Admin only) ----------
create or replace function public.set_day_schedule(p_day_number integer, p_content_ids uuid[])
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if public.current_role() <> 'admin' then
    raise exception '只有 Admin 可以调整 Journey 安排';
  end if;

  select daily_content_limit into v_limit from public.cms_journey_settings where id = '00000000-0000-0000-0000-000000000001'::uuid;
  if array_length(p_content_ids, 1) is not null and array_length(p_content_ids, 1) > v_limit then
    raise exception '目前每日内容上限为%篇，如需增加，请先到 Journey 设置修改。', v_limit;
  end if;

  delete from public.cms_journey_schedule where day_number = p_day_number;

  if p_content_ids is not null then
    insert into public.cms_journey_schedule (day_number, content_id, sort_order)
    select p_day_number, id, ord - 1
    from unnest(p_content_ids) with ordinality as t(id, ord);
  end if;
end;
$$;

revoke execute on function public.set_day_schedule(integer, uuid[]) from anon;
grant execute on function public.set_day_schedule(integer, uuid[]) to authenticated;

-- ---------- Customer-facing: today's content + completion ----------
create or replace function public.get_my_today_content()
returns table (
  content_id uuid,
  title text,
  category public.cms_content_category,
  template_type public.cms_template_type,
  fields jsonb,
  cover_image_url text,
  estimated_seconds integer,
  position_in_day integer,
  total_today integer,
  completed boolean
)
language plpgsql
stable
security definer
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
      ) as completed
    from today_items t;
end;
$$;

revoke execute on function public.get_my_today_content() from anon;
grant execute on function public.get_my_today_content() to authenticated;

create or replace function public.complete_today_content(p_content_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_day integer;
  v_title text;
  v_template public.cms_template_type;
begin
  v_day := public.customer_current_journey_day(v_customer_id);

  select c.title, c.template_type into v_title, v_template
  from public.cms_journey_schedule s
  join public.cms_content_items c on c.id = s.content_id and c.status = 'published'
  where s.day_number = v_day and s.content_id = p_content_id;

  if v_title is null then
    raise exception '这篇内容今天没有开放给你';
  end if;

  insert into public.cms_customer_content_progress (customer_id, day_number, content_id, content_title_snapshot, template_type_snapshot)
  values (v_customer_id, v_day, p_content_id, v_title, v_template)
  on conflict (customer_id, day_number, content_id) do nothing;
end;
$$;

revoke execute on function public.complete_today_content(uuid) from anon;
grant execute on function public.complete_today_content(uuid) to authenticated;
