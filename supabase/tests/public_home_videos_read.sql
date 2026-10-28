-- Execute only in the isolated staging test database. All fixtures and policy edits roll back.
begin;
-- Reproduce production's existing combined SELECT policy inside a rolled-back test.
drop policy if exists videos_read on public.videos;
create policy videos_read on public.videos for select to anon, authenticated using (status='published'::public.content_status or (select private.current_app_role()) in ('editor'::public.app_role,'admin'::public.app_role));
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

insert into public.videos (slug,title_en,platform,status) values
('home-video-regression-published-' || txid_current(),'Published regression','youtube','published'),
('home-video-regression-draft-' || txid_current(),'Private regression','youtube','draft');
set local role anon;
do $$ begin
 if (select count(*) from public.videos where slug like 'home-video-regression-%-' || txid_current())<>1 then raise exception 'Anonymous visibility regression'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $$ begin
 if (select count(*) from public.videos where slug like 'home-video-regression-%-' || txid_current())<>1 then raise exception 'Nonstaff visibility regression'; end if;
end $$;
reset role;
rollback;
