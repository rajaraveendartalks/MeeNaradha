-- Published video reads must not invoke the authenticated-only staff helper.
-- Existing authenticated access and every write policy are preserved.
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='videos' and policyname='videos_read') then
    alter policy videos_read on public.videos to authenticated;
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='videos' and policyname='videos_public_read') then
    create policy videos_public_read on public.videos for select to anon
      using (status = 'published'::public.content_status);
  end if;
end $$;
