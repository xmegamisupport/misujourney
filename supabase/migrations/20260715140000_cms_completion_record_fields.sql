-- Completion records must never rely on the old Lesson system, and must
-- carry enough context to survive future schema growth: journey_id (this
-- app only has one Journey config today, the cms_journey_settings
-- singleton, but the row already exists — recording it now costs nothing
-- and matches the CMS spec's own "more Journeys later" future-proofing
-- note) and content_version (the content's updated_at at completion time,
-- so a later edit is visibly distinguishable from what the customer
-- actually saw, on top of the title/template snapshot already stored).
alter table public.cms_customer_content_progress
  add column journey_id uuid references public.cms_journey_settings (id),
  add column content_version timestamptz;

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
  v_updated_at timestamptz;
begin
  v_day := public.customer_current_journey_day(v_customer_id);

  select c.title, c.template_type, c.updated_at into v_title, v_template, v_updated_at
  from public.cms_journey_schedule s
  join public.cms_content_items c on c.id = s.content_id and c.status = 'published'
  where s.day_number = v_day and s.content_id = p_content_id;

  if v_title is null then
    raise exception '这篇内容今天没有开放给你';
  end if;

  insert into public.cms_customer_content_progress
    (customer_id, day_number, content_id, content_title_snapshot, template_type_snapshot, journey_id, content_version)
  values
    (v_customer_id, v_day, p_content_id, v_title, v_template, '00000000-0000-0000-0000-000000000001'::uuid, v_updated_at)
  on conflict (customer_id, day_number, content_id) do nothing;
end;
$$;
