-- Older staging policies must not call a staff-only helper for anonymous homepage galleries.
do $migration$
begin
 if exists(select 1 from pg_policies where schemaname='public' and tablename='image_galleries' and policyname='image_galleries_read' and 'anon'=any(roles)) then
  alter policy image_galleries_read on public.image_galleries to authenticated;
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='image_galleries' and policyname='image_galleries_public_published_read') then
  create policy image_galleries_public_published_read on public.image_galleries for select to anon using(status='published'::public.content_status);
 end if;
end $migration$;
