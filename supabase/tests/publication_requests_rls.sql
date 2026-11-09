-- Exercise real roles, private storage, retries, review conflicts and draft conversion.
-- Every fixture and role change rolls back.
begin;
select set_config('publication_test.admin',(select user_id::text from public.user_roles where role='admin' limit 1),true);
select set_config('publication_test.editor',(select id::text from auth.users where id<>current_setting('publication_test.admin')::uuid limit 1),true);
select set_config('publication_test.key',gen_random_uuid()::text,true);
select set_config('publication_test.form',jsonb_build_object('applicant_type','studio','organisation_name','Rolled-back Partner Studio','contact_name','Test Contact','email','partner-test@example.test','phone','+91 9000000000','official_url','https://example.test/studio','article_title','A Telugu studio launch announcement','article_language','te','category','movies','content_type','press_release','summary','A private editorial review fixture.','article_body',repeat('తెలుగు కథనం. ',20)||'<script>untrusted text</script>','article_url','https://example.test/draft','media_url','https://example.test/media','preferred_date','','rights_confirmed',true,'contact_consent',true)::text,true);
select set_config('publication_test.production_guard',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='guard_news_article_publication')::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('publication_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.studio_set_user_role(current_setting('publication_test.editor')::uuid,'editor');
set local role service_role;
do $test$
declare receipt jsonb;again jsonb;blocked boolean:=false;form jsonb:=current_setting('publication_test.form')::jsonb;request_id uuid;
begin
 if length(public.publishing_request_ingest_config())<>64 then raise exception 'Ingest config unavailable';end if;
 receipt:=public.submit_publication_request(form,current_setting('publication_test.key')::uuid,repeat('a',64),repeat('b',64),repeat('f',64));
 again:=public.submit_publication_request(form,current_setting('publication_test.key')::uuid,repeat('a',64),repeat('b',64),repeat('f',64));
 if receipt<>again or receipt ? 'email' or receipt ? 'id' then raise exception 'Retry receipt is incorrect or exposes private data';end if;
 select id into request_id from private.publication_requests where submission_key=current_setting('publication_test.key')::uuid;
 perform set_config('publication_test.id',request_id::text,true);
 if (select count(*) from private.publication_requests where submission_key=current_setting('publication_test.key')::uuid)<>1 then raise exception 'Retry duplicated request';end if;
 begin perform public.submit_publication_request(form,current_setting('publication_test.key')::uuid,repeat('a',64),repeat('b',64),repeat('e',64));exception when sqlstate 'P0409' then blocked:=true;end;
 if not blocked then raise exception 'Conflicting retry was accepted';end if;
 blocked:=false;begin perform public.submit_publication_request(jsonb_set(form,'{rights_confirmed}','false'),gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('f',64));exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Missing rights confirmation accepted';end if;
 blocked:=false;begin perform public.submit_publication_request(jsonb_set(form,'{category}','"not-a-category"'),gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('f',64));exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Unknown category accepted';end if;
 blocked:=false;begin perform public.submit_publication_request(jsonb_set(form,'{article_body}','"too short"')||'{"article_url":""}',gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('f',64));exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Missing article content accepted';end if;
 blocked:=false;begin perform public.submit_publication_request(jsonb_set(form,'{preferred_date}','"2026-02-30"'),gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('f',64));exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Invalid preferred date accepted';end if;
 for i in 1..9 loop perform public.submit_publication_request(form,gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('f',64));end loop;
 blocked:=false;begin perform public.submit_publication_request(form,gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('f',64));exception when sqlstate 'P0429' then blocked:=true;end;
 if not blocked then raise exception 'IP rate limit failed';end if;
 for i in 1..20 loop perform public.submit_publication_request(form,gen_random_uuid(),lpad(to_hex(i),64,'0'),repeat('c',64),repeat('f',64));end loop;
 blocked:=false;begin perform public.submit_publication_request(form,gen_random_uuid(),repeat('d',64),repeat('c',64),repeat('f',64));exception when sqlstate 'P0429' then blocked:=true;end;
 if not blocked then raise exception 'Email rate limit failed';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('publication_test.editor'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare row jsonb;blocked boolean:=false;request_id uuid:=current_setting('publication_test.id')::uuid;
begin
 if has_table_privilege(current_user,'private.publication_requests','SELECT') or has_function_privilege(current_user,'public.submit_publication_request(jsonb,uuid,text,text,text)','EXECUTE') then raise exception 'Client role can bypass private inbox API';end if;
 row:=public.studio_get_publication_request(request_id);
 if row->>'email'<>'partner-test@example.test' or row ? 'payload_hash' or row ? 'submission_key' then raise exception 'Private reviewer detail incorrect';end if;
 if (public.studio_list_publication_requests('all','Rolled-back Partner Studio',1)->>'count')::integer<1 then raise exception 'Staff search failed';end if;
 begin perform public.studio_review_publication_request(request_id,0,'accepted','');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor accepted a request';end if;
 blocked:=false;begin perform public.studio_review_publication_request(request_id,0,'declined','');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor declined a request';end if;
 blocked:=false;begin perform public.studio_publication_request_draft(request_id,0);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Unaccepted request became a draft';end if;
 row:=public.studio_review_publication_request(request_id,0,'in_review','Private reviewer notes');
 if (row->>'revision')::integer<>1 then raise exception 'Review revision did not advance';end if;
 blocked:=false;begin perform public.studio_review_publication_request(request_id,0,'needs_changes','stale');exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'Stale review overwrote new notes';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('publication_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.studio_review_publication_request(current_setting('publication_test.id')::uuid,1,'accepted','Representation and content reviewed');
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('publication_test.editor'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare result jsonb;again jsonb;article uuid;row jsonb;blocked boolean:=false;
begin
 result:=public.studio_publication_request_draft(current_setting('publication_test.id')::uuid,2);
 again:=public.studio_publication_request_draft(current_setting('publication_test.id')::uuid,2);
 if result<>again then raise exception 'Draft retry duplicated article';end if;
 article:=(result->>'article_id')::uuid;perform set_config('publication_test.article',article::text,true);
 if not exists(select 1 from public.news_articles where id=article and status='draft' and published_at is null and author_id=auth.uid()) then raise exception 'Draft status or staff author incorrect';end if;
 if exists(select 1 from public.news_articles where id=article and (body_te like '%partner-test@example.test%' or body_te like '%+91 9000000000%')) then raise exception 'Applicant contact details copied into article';end if;
 if not exists(select 1 from public.news_articles where id=article and body_te like 'MNRICH1:%' and body_te like '%untrusted text%') then raise exception 'Article text did not convert safely';end if;
 row:=public.studio_get_publication_request(current_setting('publication_test.id')::uuid);
 if row->>'status'<>'draft_created' or row->>'article_id'<>article::text then raise exception 'Request and draft link missing';end if;
 if current_setting('publication_test.production_guard')::boolean then
  begin update public.news_articles set status='published',published_at=now() where id=article;exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Production admin publication approval bypassed';end if;
 end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;
begin
 begin perform public.studio_list_publication_requests();exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Non-staff or forged metadata accessed inbox';end if;
 blocked:=false;begin perform public.studio_get_publication_request(current_setting('publication_test.id')::uuid);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Non-staff accessed contact details';end if;
 blocked:=false;begin perform public.studio_review_publication_request(current_setting('publication_test.id')::uuid,3,'accepted','forged');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Non-staff updated a request';end if;
 blocked:=false;begin perform public.studio_publication_request_draft(current_setting('publication_test.id')::uuid,3);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Non-staff accessed a draft';end if;
end $test$;
set local role anon;
do $test$
declare blocked boolean:=false;
begin
 if has_function_privilege(current_user,'public.submit_publication_request(jsonb,uuid,text,text,text)','EXECUTE') or has_function_privilege(current_user,'public.publishing_request_ingest_config()','EXECUTE') then raise exception 'Anonymous private privileges leaked';end if;
 begin perform 1 from private.publication_requests;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous raw inbox access';end if;
 blocked:=false;
 begin perform public.studio_get_publication_request(current_setting('publication_test.id')::uuid);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous read a request';end if;
 if exists(select 1 from public.news_articles where id=current_setting('publication_test.article')::uuid) then raise exception 'Unpublished partner article visible publicly';end if;
end $test$;
rollback;
select jsonb_build_object('private_registration','passed','idempotency','passed','validation','passed','rate_limits','passed','staff_review','passed','stale_updates','blocked','admin_acceptance','passed','unpublished_draft','passed','client_and_non_staff_access','blocked','fixtures','rolled back') as publication_verification;
