-- Run in the isolated test project. Fixtures are rolled back.
begin;
insert into public.news_articles (slug,headline_en,status) values
('rls-regression-published-' || txid_current(), 'RLS regression published', 'published'),
('rls-regression-draft-' || txid_current(), 'RLS regression draft', 'draft');
do $$ begin
if has_function_privilege('anon','private.current_app_role()','execute') then raise exception 'Anonymous role helper exposed'; end if;
end $$;
set local role anon;
do $$ begin
if (select count(*) from public.news_articles where slug like 'rls-regression-%-' || txid_current()) <> 1 then raise exception 'Anonymous visibility regression'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $$ begin
if (select count(*) from public.news_articles where slug like 'rls-regression-%-' || txid_current()) <> 1 then raise exception 'Nonstaff visibility regression'; end if;
end $$;
reset role;
rollback;
