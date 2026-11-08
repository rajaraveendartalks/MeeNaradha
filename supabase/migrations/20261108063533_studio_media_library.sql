-- Retain the existing public media bucket; provision the same bucket in test environments.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('media','media',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- Only existing editors/admins may browse media metadata. Public image URLs are unchanged.
do $policy$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='studio_media_staff_read') then
    create policy studio_media_staff_read on storage.objects
      for select to authenticated
      using (bucket_id='media' and exists (
        select 1 from public.user_roles ur
        where ur.user_id=(select auth.uid()) and ur.role in ('editor','admin')
      ));
  end if;
  -- Production already has this policy; this gives an empty test project the same upload permissions.
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='v1_media_staff_insert') then
    create policy v1_media_staff_insert on storage.objects
      for insert to authenticated
      with check (bucket_id='media' and exists (
        select 1 from public.user_roles ur
        where ur.user_id=(select auth.uid()) and ur.role in ('editor','admin')
      ));
  end if;
end
$policy$;
