-- Private Storage bucket for Body Progress photos (Sprint 001).
-- Path convention: {customer_id}/{record_id}/{angle}.{ext} — record_id is a
-- fresh UUID per submission, so no future upload can ever overwrite a past
-- one. Bucket is private (unlike cms-content-images); customers write only
-- their own folder, coach/admin read-only over their scope, no
-- update/delete policy for anyone (append-only, matches the DB tables).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('body-progress-photos', 'body-progress-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

create policy "body_progress_photos_insert_own" on storage.objects
  for insert
  with check (bucket_id = 'body-progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "body_progress_photos_select_own" on storage.objects
  for select
  using (bucket_id = 'body-progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "body_progress_photos_select_as_coach" on storage.objects
  for select
  using (bucket_id = 'body-progress-photos' and (storage.foldername(name))[1] in (select id::text from public.profiles where coach_id = auth.uid()));

create policy "body_progress_photos_select_as_admin" on storage.objects
  for select
  using (bucket_id = 'body-progress-photos' and public.current_role() = 'admin');
