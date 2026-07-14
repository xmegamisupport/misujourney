-- Storage bucket for CMS content images (cover photos + template image
-- fields) — public read so customers can view them directly via the
-- public URL with no auth round trip; writes restricted to CMS staff.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-content-images', 'cms-content-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

create policy "cms_images_insert" on storage.objects
  for insert
  with check (bucket_id = 'cms-content-images' and public.current_role() in ('admin', 'nutritionist', 'trainer'));

create policy "cms_images_update" on storage.objects
  for update
  using (bucket_id = 'cms-content-images' and (owner = auth.uid() or public.current_role() = 'admin'));

create policy "cms_images_delete" on storage.objects
  for delete
  using (bucket_id = 'cms-content-images' and (owner = auth.uid() or public.current_role() = 'admin'));
