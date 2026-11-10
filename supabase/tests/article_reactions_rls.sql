-- All accounts, articles, votes, settings edits and rate-test events are rolled back.
begin;
select set_config('reaction_test.admin',(select user_id::text from public.user_roles where role='admin' limit 1),true);
do $test$
declare editor uuid:=gen_random_uuid();article uuid;other_article uuid;draft uuid;suffix text:=gen_random_uuid()::text;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(editor,'reaction-qa-'||suffix||'@example.test','{}');
 insert into public.user_roles(user_id,role) values(editor,'editor');
 insert into public.news_articles(slug,headline_en,headline_te,body_te,category,status,author_id,published_at) values('reaction-qa-'||suffix,'Reaction test','స్పందన పరీక్ష','A transaction-only test article.','movies','published',editor,now()) returning id into article;
 insert into public.news_articles(slug,headline_en,body_te,category,status,published_at) values('reaction-other-'||suffix,'Other article','Another test article.','politics','published',now()) returning id into other_article;
 insert into public.news_articles(slug,headline_en,body_te,category,status) values('reaction-draft-'||suffix,'Draft test','Private draft.','movies','draft') returning id into draft;
 perform set_config('reaction_test.votes_oid','private.article_reaction_votes'::regclass::oid::text,true);perform set_config('reaction_test.editor',editor::text,true);perform set_config('reaction_test.article',article::text,true);perform set_config('reaction_test.other',other_article::text,true);perform set_config('reaction_test.draft',draft::text,true);
end $test$;
set local role service_role;
do $test$
declare article uuid:=current_setting('reaction_test.article')::uuid;other_article uuid:=current_setting('reaction_test.other')::uuid;state jsonb;operation uuid:=gen_random_uuid();blocked boolean:=false;events integer;
begin
 if length(public.article_reaction_ingest_config())<>64 then raise exception 'Reaction signing salt unavailable';end if;
 state:=public.article_reaction_state(article,null);if state->>'total'<>'0' or state->>'version'<>'0' or not (state->'allowed'?'kiss') then raise exception 'Initial reaction state incorrect: %',state;end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),'like',operation,0);
 if state->>'selected'<>'like' or state->>'total'<>'1' or state->>'version'<>'1' then raise exception 'First vote did not save: %',state;end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),'like',operation,0);
 perform public.set_article_reaction(article,repeat('a',64),repeat('c',64),'like',gen_random_uuid(),1);
 if state->>'total'<>'1' or (select count(*) from private.article_reaction_events where article_id=article)<>1 then raise exception 'Replay inflated the count';end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),'heart',gen_random_uuid(),1);
 if state->'counts'->>'like'<>'0' or state->'counts'->>'heart'<>'1' or state->>'total'<>'1' then raise exception 'Changing vote did not move the count';end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),'angry',gen_random_uuid(),1);
 if state->>'conflict'<>'true' or state->'state'->>'selected'<>'heart' then raise exception 'Stale tab overwrote the newer vote';end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),null,gen_random_uuid(),2);
 if state->>'total'<>'0' or state->>'version'<>'3' or state->>'selected' is not null then raise exception 'Removing vote failed';end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),'egg',gen_random_uuid(),3);
 if state->'counts'->>'egg'<>'1' or state->>'version'<>'4' then raise exception 'Egg reaction failed';end if;
 state:=public.article_reaction_state(article,repeat('b',64));if state->>'selected' is not null or state->>'version'<>'0' or state->>'total'<>'1' then raise exception 'Another browser choice was exposed';end if;
 begin perform public.set_article_reaction(other_article,repeat('b',64),repeat('c',64),'kiss',gen_random_uuid(),0);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Kiss category restriction bypassed';end if;
 blocked:=false;begin perform public.article_reaction_state(current_setting('reaction_test.draft')::uuid,null);exception when sqlstate 'P0404' then blocked:=true;end;if not blocked then raise exception 'Draft reactions exposed';end if;
 blocked:=false;begin perform public.set_article_reaction(article,'invalid',repeat('c',64),'like',gen_random_uuid(),4);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Invalid browser identity accepted';end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),'kiss',gen_random_uuid(),4);if state->>'selected'<>'kiss' then raise exception 'Movie Kiss option failed';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('reaction_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare old_version integer;blocked boolean:=false;
begin
 select revision into old_version from public.site_reaction_settings where id='website';
 update public.site_reaction_settings set enabled=false,kiss_enabled=false where id='website' and revision=old_version;
 if not found then raise exception 'Admin could not update reaction settings';end if;
 update public.site_reaction_settings set enabled=true where id='website' and revision=old_version;
 if found then raise exception 'Stale settings edit was accepted';end if;
 begin update public.site_reaction_settings set kiss_categories=array['not-a-real-category'] where id='website';exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Invalid Kiss category accepted';end if;
end $test$;
set local role service_role;
do $test$
declare article uuid:=current_setting('reaction_test.article')::uuid;state jsonb;blocked boolean:=false;
begin
 state:=public.article_reaction_state(article,repeat('a',64));if state->>'enabled'<>'false' or jsonb_array_length(state->'allowed')<>0 then raise exception 'Global pause ignored';end if;
 begin perform public.set_article_reaction(article,repeat('a',64),repeat('c',64),'like',gen_random_uuid(),5);exception when invalid_parameter_value then blocked:=true;end;if not blocked then raise exception 'Paused reactions accepted a new choice';end if;
 state:=public.set_article_reaction(article,repeat('a',64),repeat('c',64),null,gen_random_uuid(),5);if state->>'version'<>'6' then raise exception 'Reader could not remove a paused reaction';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('reaction_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
update public.site_reaction_settings set enabled=true where id='website';
set local role service_role;
do $test$
declare state jsonb;
begin
 state:=public.set_article_reaction(current_setting('reaction_test.article')::uuid,repeat('a',64),repeat('c',64),'heart',gen_random_uuid(),6);
 if state->'allowed'?'kiss' then raise exception 'Disabled Kiss is still offered';end if;
 perform public.set_article_reaction(current_setting('reaction_test.other')::uuid,repeat('b',64),repeat('c',64),'angry',gen_random_uuid(),0);
 insert into private.article_events(article_id,kind,platform,visitor_hash) values(current_setting('reaction_test.article')::uuid,'view','none',repeat('d',64)),(current_setting('reaction_test.article')::uuid,'view','none',repeat('e',64)),(current_setting('reaction_test.other')::uuid,'view','none',repeat('d',64));
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('reaction_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare report jsonb;article jsonb;today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 report:=public.studio_reaction_report(today,today,null,current_setting('reaction_test.editor')::uuid);
 select value into article from jsonb_array_elements(report->'articles') where value->>'id'=current_setting('reaction_test.article');
 if article->>'total'<>'1' or article->'counts'->>'heart'<>'1' or article->>'views'<>'2' or report->'totals'->>'total'<>'1' then raise exception 'Aggregate report counts incorrect: %',report;end if;
 if report::text like '%browser_hash%' or report::text like '%client_hash%' then raise exception 'Report exposed private identities';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('reaction_test.editor'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare report jsonb;blocked boolean:=false;today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 report:=public.studio_reaction_report(today,today);
 if report->>'article_count'<>'1' or exists(select 1 from jsonb_array_elements(report->'articles') row where row->>'author_id'<>current_setting('reaction_test.editor')) then raise exception 'Editor saw another writer reaction report';end if;
 update public.site_reaction_settings set kiss_enabled=true where id='website';if found then raise exception 'Editor changed global settings';end if;
 begin perform public.studio_reaction_report(today,today,null,current_setting('reaction_test.admin')::uuid);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Editor bypassed author scope';end if;
 if has_table_privilege(current_user,current_setting('reaction_test.votes_oid')::oid,'SELECT') or has_table_privilege(current_user,'private.article_reaction_events','SELECT') then raise exception 'Staff read individual votes';end if;
end $test$;
set local role anon;
do $test$
declare blocked boolean:=false;
begin
 if has_function_privilege(current_user,'public.set_article_reaction(uuid,text,text,text,uuid,bigint)','EXECUTE') or has_function_privilege(current_user,'public.article_reaction_state(uuid,text)','EXECUTE') or has_function_privilege(current_user,'public.article_reaction_ingest_config()','EXECUTE') then raise exception 'Anonymous role bypassed the Edge validation boundary';end if;
 if has_table_privilege(current_user,current_setting('reaction_test.votes_oid')::oid,'SELECT') then raise exception 'Anonymous identity exposure';end if;
 begin perform public.studio_reaction_report(current_date,current_date);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Anonymous reports allowed';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;
begin
 begin perform public.studio_reaction_report(current_date,current_date);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'Metadata granted reaction report access';end if;
 update public.site_reaction_settings set enabled=false where id='website';if found then raise exception 'Metadata changed settings';end if;
end $test$;
set local role service_role;
do $test$
declare i integer;version bigint:=0;blocked boolean:=false;reaction text;browser text;
begin
 for i in 1..31 loop reaction:=case when i%2=0 then 'heart' else 'like' end;begin perform public.set_article_reaction(current_setting('reaction_test.article')::uuid,repeat('f',64),repeat('9',64),reaction,gen_random_uuid(),version);version:=version+1;exception when sqlstate 'P0429' then blocked:=true;exit;end;end loop;
 if not blocked or version<>30 then raise exception 'Per-browser rate limit failed: %',version;end if;
 blocked:=false;for i in 1..121 loop browser:=lpad(to_hex(i),64,'0');begin perform public.set_article_reaction(current_setting('reaction_test.article')::uuid,browser,repeat('8',64),'like',gen_random_uuid(),0);exception when sqlstate 'P0429' then blocked:=true;exit;end;end loop;
 if not blocked then raise exception 'IP rate limit did not bound browser identity churn';end if;
 if (select like_count+heart_count+angry_count+lol_count+kiss_count+egg_count from private.article_reaction_totals where article_id=current_setting('reaction_test.article')::uuid)<>(select count(*) from private.article_reaction_votes votes where votes.article_id=current_setting('reaction_test.article')::uuid and votes.reaction is not null) then raise exception 'Stored totals differ from active choices';end if;
end $test$;
rollback;
select jsonb_build_object('vote_change_remove','passed','idempotent_retries','passed','stale_tab_conflicts','passed','kiss_category_controls','passed','global_pause','passed','private_individual_votes','passed','author_scoped_reports','passed','anonymous_and_metadata_access','blocked','rate_limits','passed','fixtures','rolled back') as reaction_verification;
