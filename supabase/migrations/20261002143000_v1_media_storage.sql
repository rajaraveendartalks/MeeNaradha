insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "v1_media_staff_insert" on storage.objects for insert to authenticated
with check (bucket_id='media' and exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role in ('editor','admin')));
create policy "v1_media_staff_update" on storage.objects for update to authenticated
using (bucket_id='media' and exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role in ('editor','admin')))
with check (bucket_id='media' and exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role in ('editor','admin')));
create policy "v1_media_staff_delete" on storage.objects for delete to authenticated
using (bucket_id='media' and exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role in ('editor','admin')));
