-- Learning History for customers.
--
-- The learning experience is being unified: "今日小知识" (Dashboard task) and
-- "今日学习" (the 学习 tab) already share ONE data source — get_my_today_content()
-- + complete_today_content() over cms_journey_schedule / cms_customer_content_progress.
-- No new tables or completion records are introduced here; every completion is
-- still the single permanent row in cms_customer_content_progress.
--
-- This adds ONE read-only RPC so the 学习 centre can show previously-unlocked
-- content for review. It returns the customer's PAST days only (day_number <
-- their current Journey day), so future Journey content is never exposed early.
-- SECURITY DEFINER is required because customers have no SELECT on
-- cms_journey_schedule (staff-only policy); the function scopes every row to
-- auth.uid() and to strictly-past days, mirroring get_my_today_content()'s
-- per-day limit and poster_media shape so the same viewer renders both.

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
      -- Only content scheduled to a day the customer has already passed, capped
      -- to the same per-day limit as today's feed → what was actually unlocked,
      -- never Day (current) or later.
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
      exists(
        select 1 from public.cms_customer_content_progress p
        where p.customer_id = v_customer_id and p.day_number = u.day_number and p.content_id = u.id
      ) as completed,
      (
        select p.completed_at from public.cms_customer_content_progress p
        where p.customer_id = v_customer_id and p.day_number = u.day_number and p.content_id = u.id
      ) as completed_at
    from unlocked u
    where u.pos <= v_limit
    order by u.day_number desc, u.pos asc;
end;
$$;

revoke execute on function public.get_my_learning_history() from anon;
grant execute on function public.get_my_learning_history() to authenticated;
