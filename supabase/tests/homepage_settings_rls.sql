-- Verify draft isolation, atomic publish and stale-edit protection. All edits roll back.
begin;
select set_config('request.jwt.claims',jsonb_build_object(
  'sub',(select user_id from public.user_roles where role in ('admin','editor') order by role::text limit 1),
  'role','authenticated'
)::text,true);
set local role authenticated;
do $test$
declare
  draft_row public.homepage_settings%rowtype;
  live_row public.homepage_settings%rowtype;
  result jsonb;
  changed jsonb;
  stale_blocked boolean:=false;
begin
  select * into draft_row from public.homepage_settings where id='draft';
  select * into live_row from public.homepage_settings where id='published';
  changed:=jsonb_set(draft_row.config,'{intro,title}',to_jsonb('Transaction-only homepage test'::text));
  result:=public.save_homepage_settings(changed,draft_row.revision,live_row.revision,false);
  if (select config from public.homepage_settings where id='published')<>live_row.config then
    raise exception 'Saving a draft changed the public homepage';
  end if;
  if (select config from public.homepage_settings where id='draft')<>changed then
    raise exception 'Draft save failed';
  end if;
  begin
    perform public.save_homepage_settings(changed,draft_row.revision,live_row.revision,true);
  exception when serialization_failure then stale_blocked:=true;
  end;
  if not stale_blocked then raise exception 'A stale editor overwrote newer changes'; end if;
  if (select config from public.homepage_settings where id='published')<>live_row.config then
    raise exception 'A failed stale publish changed the public homepage';
  end if;
  result:=public.save_homepage_settings(changed,(result->'draft'->>'revision')::integer,live_row.revision,true);
  if result->'draft'->'config'<>changed or result->'published'->'config'<>changed then
    raise exception 'Atomic homepage publish failed';
  end if;
end
$test$;
set local role anon;
do $test$
declare denied boolean:=false; affected integer;
begin
  if (select count(*) from public.homepage_settings)<>1 or exists(select 1 from public.homepage_settings where id='draft') then
    raise exception 'An anonymous visitor can read draft settings';
  end if;
  begin
    perform public.save_homepage_settings('{"version":1}',0,0,true);
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'Anonymous publish was allowed'; end if;
  begin
    update public.homepage_settings set revision=revision+1;
    get diagnostics affected=row_count;
    if affected>0 then raise exception 'Anonymous settings write was allowed'; end if;
  exception when insufficient_privilege then null;
  end;
end
$test$;
set local role postgres;
-- A signed-in account without an editorial role still has only public access.
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare denied boolean:=false; affected integer;
begin
  if (select count(*) from public.homepage_settings)<>1 then raise exception 'A non-editor can read a draft'; end if;
  begin
    perform public.save_homepage_settings('{"version":1}',0,0,true);
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'A non-editor published the homepage'; end if;
  update public.homepage_settings set revision=revision+1;
  get diagnostics affected=row_count;
  if affected>0 then raise exception 'A non-editor updated homepage settings'; end if;
end
$test$;
rollback;
select jsonb_build_object('draft_isolation','passed','atomic_publish','passed','stale_publish','blocked','anonymous_and_non_editor_writes','blocked','test_changes','rolled back') as homepage_verification;
