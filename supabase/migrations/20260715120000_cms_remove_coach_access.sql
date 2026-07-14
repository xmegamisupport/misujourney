-- Coach doesn't need the Knowledge CMS after all — it lives under Admin
-- (+ Nutritionist/Trainer who create content). Coach may get scoped
-- "submit to library" access later via an Admin-granted per-account
-- permission, not a blanket role grant, so this only narrows the existing
-- staff-wide read policies rather than redesigning them.

drop policy "cms_content_select_staff" on public.cms_content_items;
create policy "cms_content_select_staff" on public.cms_content_items
  for select using (public.current_role() in ('admin', 'nutritionist', 'trainer'));

drop policy "cms_journey_settings_select_staff" on public.cms_journey_settings;
create policy "cms_journey_settings_select_staff" on public.cms_journey_settings
  for select using (public.current_role() in ('admin', 'nutritionist', 'trainer'));

drop policy "cms_journey_schedule_select_staff" on public.cms_journey_schedule;
create policy "cms_journey_schedule_select_staff" on public.cms_journey_schedule
  for select using (public.current_role() in ('admin', 'nutritionist', 'trainer'));
