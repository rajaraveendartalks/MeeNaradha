-- Some older staging projects still share staff/public read policies.
-- Match the public published-only access already used by production profiles.
do $migration$
declare table_name text;legacy_policy text;public_policy text;
begin
 for table_name,legacy_policy,public_policy in select * from (values
  ('movies','movies_read','movies_public_published_read'),
  ('people','people_read','people_public_published_read')
 ) as targets(table_name,legacy_policy,public_policy)
 loop
  if exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=table_name and p.policyname=legacy_policy and 'anon'=any(p.roles)) then
   execute format('alter policy %I on public.%I to authenticated',legacy_policy,table_name);
  end if;
  if not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=table_name and p.policyname=public_policy) then
   execute format('create policy %I on public.%I for select to anon using (status = %L::public.content_status)',public_policy,table_name,'published');
  end if;
 end loop;
end $migration$;
