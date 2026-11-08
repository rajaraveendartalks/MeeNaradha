-- Permission, attribution, ingestion and report isolation tests. All changes roll back.
begin;
select set_config('editorial_test.admin',(select user_id::text from public.user_roles where role='admin' limit 1),true);
select set_config('editorial_test.editor',(select id::text from auth.users where id<>current_setting('editorial_test.admin')::uuid limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('editorial_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.studio_set_user_role(current_setting('editorial_test.editor')::uuid,'editor');
do $test$
declare article uuid;version integer;result jsonb;
begin
 if jsonb_array_length(public.studio_writers())<2 then raise exception 'Admin cannot load writer choices';end if;
 select revision into version from public.site_typography where id='website';
 update public.site_typography set config=jsonb_set(config,'{headline}','"mandali"') where id='website' and revision=version;
 if (select revision from public.site_typography where id='website')<>version+1 then raise exception 'Typography revision did not advance';end if;
 update public.site_typography set config=jsonb_set(config,'{headline}','"ntr"') where id='website' and revision=version;
 if found then raise exception 'Stale typography update accepted';end if;
 insert into public.editorial_calendar(title,event_date,kind,annual) values('Rolled-back calendar event','2026-11-08','milestone',true);
 insert into public.news_articles(slug,headline_en,body_en,status,published_at) values('editorial-admin-'||gen_random_uuid(),'Rolled-back admin story','Test content','published',now()) returning id into article;
 perform set_config('editorial_test.admin_article',article::text,true);
 if (select author_id from public.news_articles where id=article)<>auth.uid() then raise exception 'New writer attribution missing';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('editorial_test.editor'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;article uuid;version integer;
begin
 if (select count(*) from public.editorial_calendar)<1 then raise exception 'Editor calendar access failed';end if;
 update public.editorial_calendar set archived=true where title='Rolled-back calendar event' returning revision into version;
 if version<>1 then raise exception 'Calendar revision did not advance';end if;
 update public.editorial_calendar set archived=false where title='Rolled-back calendar event';
 begin update public.site_typography set config=jsonb_set(config,'{headline}','"ramabhadra"') where id='website';exception when insufficient_privilege then blocked:=true;end;
 if not blocked and (select config->>'headline' from public.site_typography where id='website')<>'mandali' then raise exception 'Editor changed website fonts';end if;
 blocked:=false;begin perform public.studio_writers();exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor read private writer directory';end if;
 insert into public.news_articles(slug,headline_en,body_en,status,published_at) values('editorial-writer-'||gen_random_uuid(),'Rolled-back writer story','Test content','published',now()) returning id into article;
 perform set_config('editorial_test.editor_article',article::text,true);
 if (select author_id from public.news_articles where id=article)<>auth.uid() then raise exception 'Editor attribution failed';end if;
 blocked:=false;begin update public.news_articles set author_id=current_setting('editorial_test.admin')::uuid where id=article;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor reassigned author';end if;
 blocked:=false;begin perform public.record_article_event(article,'view','none',repeat('a',64),repeat('b',64));exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Browser role can bypass ingest';end if;
end $test$;
set local role service_role;
do $test$
declare a uuid:=current_setting('editorial_test.admin_article')::uuid;e uuid:=current_setting('editorial_test.editor_article')::uuid;blocked boolean:=false;
begin
 if length(public.article_analytics_ingest_config())<>64 then raise exception 'Ingest salt unavailable';end if;
 perform public.record_article_event(a,'view','none',repeat('a',64),repeat('b',64));
 perform public.record_article_event(a,'view','none',repeat('a',64),repeat('b',64));
 perform public.record_article_event(a,'share_click','facebook',repeat('a',64),repeat('b',64));
 perform public.record_article_event(e,'view','none',repeat('c',64),repeat('d',64));
 if (select count(*) from private.article_events where article_id=a)<>2 then raise exception 'Reload deduplication failed';end if;
 begin perform public.record_article_event(a,'share_click','javascript',repeat('a',64),repeat('b',64));exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Invalid analytics platform accepted';end if;
 for i in 1..65 loop perform public.record_article_event(e,'view','none',repeat('e',64),repeat('f',64));end loop;
 if public.record_article_event(e,'view','none',repeat('1',64),repeat('f',64)) then raise exception 'Ingest rate limit failed';end if;
end $test$;
set local role authenticated;
do $test$
declare result jsonb;today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 result:=public.studio_article_report(today,today,current_setting('editorial_test.admin')::uuid,null);
 if exists(select 1 from jsonb_array_elements(result->'articles') a where a->>'author_id'<>auth.uid()::text) then raise exception 'Editor read another writer report';end if;
 if not exists(select 1 from jsonb_array_elements(result->'articles') a where a->>'id'=current_setting('editorial_test.editor_article') and (a->>'views')::int=2) then raise exception 'Editor own report counts incorrect';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('editorial_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare result jsonb;today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 result:=public.studio_article_report(today,today,null,null);
 if not exists(select 1 from jsonb_array_elements(result->'articles') a where a->>'id'=current_setting('editorial_test.admin_article') and (a->>'views')::int=1 and (a->>'share_clicks')::int=1) then raise exception 'Admin article report incorrect';end if;
 if has_table_privilege(current_user,'private.article_events','SELECT') then raise exception 'Raw audience data exposed to client roles';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;
begin
 if exists(select 1 from public.editorial_calendar) then raise exception 'Non-staff calendar leak';end if;
 begin perform public.studio_article_report(current_date,current_date,null,null);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Non-staff report access';end if;
 blocked:=false;begin insert into public.editorial_calendar(title,event_date,kind) values('Forbidden',current_date,'milestone');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Non-staff calendar write';end if;
end $test$;
set local role anon;
do $test$
declare blocked boolean:=false;
begin
 if (select count(*) from public.site_typography)<>1 then raise exception 'Public font read failed';end if;
 begin perform public.studio_article_report(current_date,current_date,null,null);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous reports exposed';end if;
 if has_table_privilege(current_user,'public.editorial_calendar','SELECT') or has_function_privilege(current_user,'public.record_article_event(uuid,text,text,text,text)','EXECUTE') then raise exception 'Anonymous analytics/calendar privilege leak';end if;
end $test$;
rollback;
select jsonb_build_object('font_save_conflicts','passed','calendar_create_archive_restore','passed','writer_attribution','passed','editor_reassignment','blocked','view_deduplication','passed','ingest_rate_limit','passed','editor_report_isolation','passed','admin_reports','passed','anonymous_and_non_staff','blocked','fixtures','rolled back') as editorial_verification;
