-- Published reviews and their published OTT metadata need no staff-role lookup.
-- Staff read/write policies and existing homepage draft/live permissions are preserved.
do $migration$
declare target text;
begin
 foreach target in array array['reviews','ott_titles'] loop
  if exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=target and p.policyname=target||'_read' and 'anon'=any(p.roles)) then
   execute format('alter policy %I on public.%I to authenticated',target||'_read',target);
  end if;
  if not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=target and p.policyname=target||'_public_published_read') then
   execute format('create policy %I on public.%I for select to anon using (status = %L::public.content_status)',target||'_public_published_read',target,'published');
  end if;
 end loop;
end $migration$;
