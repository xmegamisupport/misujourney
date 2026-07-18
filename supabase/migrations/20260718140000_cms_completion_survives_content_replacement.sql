-- Learning completion must survive an Admin content replacement.
--
-- Completion is recorded per (customer, day_number, content_id). Both
-- customer-facing feeds resolve WHAT to show from cms_journey_schedule (the
-- active Day assignment — already the single source of truth), but they resolved
-- WHETHER it was completed by matching content_id exactly. So when Admin swaps a
-- day's content, the old progress row no longer matches the newly-scheduled
-- content id and the customer is silently un-completed for a day they finished.
--
-- Fix: completion status is decoupled from the content VERSION. A day counts as
-- completed for a given scheduled item when the customer has a progress row for
-- that day which either
--   (a) matches this content exactly, or
--   (b) points at content that is no longer scheduled for that day — i.e. a
--       retired version the customer genuinely completed.
--
-- (b) only ever fires after a replacement, so multi-item days keep exact
-- per-item semantics: completing item 1 of a 2-item day does not mark item 2,
-- because item 1 is still scheduled.
--
-- No data is written, deleted or duplicated here — completion rows, their dates
-- and Journey progress are all untouched; only the read-side predicate changes.

create or replace function public.customer_day_learning_completed(p_customer_id uuid, p_day integer, p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.cms_customer_content_progress p
    where p.customer_id = p_customer_id
      and p.day_number = p_day
      and (
        p.content_id = p_content_id
        or not exists (
          select 1 from public.cms_journey_schedule s
          where s.day_number = p.day_number and s.content_id = p.content_id
        )
      )
  );
$$;

revoke execute on function public.customer_day_learning_completed(uuid, integer, uuid) from anon;
grant execute on function public.customer_day_learning_completed(uuid, integer, uuid) to authenticated;

create or replace function public.customer_day_learning_completed_at(p_customer_id uuid, p_day integer, p_content_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(p.completed_at)
  from public.cms_customer_content_progress p
  where p.customer_id = p_customer_id
    and p.day_number = p_day
    and (
      p.content_id = p_content_id
      or not exists (
        select 1 from public.cms_journey_schedule s
        where s.day_number = p.day_number and s.content_id = p.content_id
      )
    );
$$;

revoke execute on function public.customer_day_learning_completed_at(uuid, integer, uuid) from anon;
grant execute on function public.customer_day_learning_completed_at(uuid, integer, uuid) to authenticated;

-- ---------- today's feed: same shape, completion via the shared helper ----------
create or replace function public.get_my_today_content()
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
      public.customer_day_learning_completed(v_customer_id, v_day, t.id) as completed,
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

revoke execute on function public.get_my_today_content() from anon;
grant execute on function public.get_my_today_content() to authenticated;

-- ---------- history: same shape, completion via the shared helper ----------
create or replace function public.get_my_learning_history()
returns table(
  day_number integer,
  content_id uuid,
  title text,
  category public.cms_content_category,
  template_type public.cms_template_type,
  fields jsonb,
  cover_image_url text,
  estimated_seconds integer,
  content_creation_mode text,
  poster_description text,
  poster_alt_text text,
  poster_media jsonb,
  completed boolean,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_day integer;
  v_limit integer;
begin
  select daily_content_limit into v_limit
  from public.cms_journey_settings where id = '00000000-0000-0000-0000-000000000001'::uuid;
  v_limit := coalesce(v_limit, 1);

  v_day := public.customer_current_journey_day(v_customer_id);

  return query
    with unlocked as (
      select c.id, c.title, c.category, c.template_type, c.fields, c.cover_image_url,
             c.estimated_seconds, c.content_creation_mode, c.poster_description, c.poster_alt_text,
             s.day_number,
             row_number() over (partition by s.day_number order by s.sort_order) as pos
      from public.cms_journey_schedule s
      join public.cms_content_items c on c.id = s.content_id and c.status = 'published'
      where s.day_number < v_day
    )
    select
      u.day_number,
      u.id,
      u.title,
      u.category,
      u.template_type,
      u.fields,
      u.cover_image_url,
      u.estimated_seconds,
      u.content_creation_mode,
      u.poster_description,
      u.poster_alt_text,
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', m.id, 'fileUrl', m.file_url, 'sortOrder', m.sort_order,
                 'width', m.width, 'height', m.height, 'aspectRatio', m.aspect_ratio, 'fileSize', m.file_size
               ) order by m.sort_order)
        from public.cms_content_media m where m.content_id = u.id
      ), '[]'::jsonb) as poster_media,
      public.customer_day_learning_completed(v_customer_id, u.day_number, u.id) as completed,
      public.customer_day_learning_completed_at(v_customer_id, u.day_number, u.id) as completed_at
    from unlocked u
    where u.pos <= v_limit
    order by u.day_number desc, u.pos asc;
end;
$$;

revoke execute on function public.get_my_learning_history() from anon;
grant execute on function public.get_my_learning_history() to authenticated;
