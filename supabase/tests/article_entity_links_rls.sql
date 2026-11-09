-- Existing staff identity is used only inside this rolled-back transaction.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.user_roles where role in ('admin','editor') order by role::text limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare suffix text:=gen_random_uuid()::text;person uuid;hidden uuid;studio uuid;movie uuid;article uuid;blocked boolean:=false;
begin
 insert into public.people(slug,name_en,name_te,primary_profession,status,article_aliases) values('links-person-'||suffix,'Unique Link Person '||suffix,'లింకు పరీక్ష వ్యక్తి','director','published',array['Shared Link Alias '||suffix]) returning id into person;
 insert into public.people(slug,name_en,primary_profession,status,article_aliases) values('links-hidden-'||suffix,'Hidden Link Person '||suffix,'actor','draft',array['Secret Link Alias '||suffix]) returning id into hidden;
 insert into public.companies(slug,name_en,name_te,status,article_aliases) values('links-studio-'||suffix,'Link Studio '||suffix,'లింకు పరీక్ష స్టూడియో','published',array['Shared Link Alias '||suffix]) returning id into studio;
 insert into public.movies(slug,title_en,title_te,status,article_aliases) values('links-movie-'||suffix,'Link Movie '||suffix,'లింకు పరీక్ష సినిమా','published',array['Link Film '||suffix]) returning id into movie;
 insert into public.news_articles(slug,headline_en,body_te,status,published_at) values('links-article-'||suffix,'Entity link verification','Unique Link Person '||suffix||' · Link Studio '||suffix||' · Link Movie '||suffix,'published',now()) returning id into article;
 insert into public.news_articles(slug,headline_en,body_te,status) values('links-draft-'||suffix,'Draft verification','Unique Link Person '||suffix,'draft');
 insert into public.news_articles(slug,headline_en,body_te,status,published_at,auto_link_entities) values('links-off-'||suffix,'Disabled verification','Unique Link Person '||suffix,'published',now(),false);
 perform set_config('links_test.suffix',suffix,true);perform set_config('links_test.person',person::text,true);perform set_config('links_test.hidden',hidden::text,true);perform set_config('links_test.studio',studio::text,true);perform set_config('links_test.movie',movie::text,true);perform set_config('links_test.article',article::text,true);
 begin update public.people set article_aliases=array_fill('alias'::text,array[31]) where id=person;exception when check_violation then blocked:=true;end;
 if not blocked then raise exception 'Alias bounds were not enforced';end if;
end $test$;
set local role anon;
do $test$
declare suffix text:=current_setting('links_test.suffix');text_value text;targets integer;blocked boolean:=false;affected integer;
begin
 text_value:='Unique Link Person '||suffix||' Link Studio '||suffix||' Link Movie '||suffix||' Hidden Link Person '||suffix||' Secret Link Alias '||suffix;
 if exists(select 1 from public.article_entity_candidates(text_value) where id=current_setting('links_test.hidden')::uuid) then raise exception 'Draft profile exposed';end if;
 select count(*) into targets from public.article_entity_candidates(text_value) where id in(current_setting('links_test.person')::uuid,current_setting('links_test.studio')::uuid,current_setting('links_test.movie')::uuid);
 if targets<>3 then raise exception 'Published profile candidates missing: %',targets;end if;
 select count(*) into targets from public.article_entity_candidates('Shared Link Alias '||suffix) where id in(current_setting('links_test.person')::uuid,current_setting('links_test.studio')::uuid);
 if targets<>2 then raise exception 'Ambiguity was hidden from the link renderer';end if;
 if (select count(*) from public.entity_related_articles('person',current_setting('links_test.person')::uuid) where slug like 'links-%-'||suffix)<>1 then raise exception 'Draft or disabled article included in related coverage';end if;
 if exists(select 1 from public.entity_related_articles('person',current_setting('links_test.hidden')::uuid)) then raise exception 'Draft profile related news exposed';end if;
 begin insert into public.people(slug,name_en,status) values('links-forbidden-'||suffix,'Forbidden','published');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous profile write accepted';end if;
 begin update public.people set article_aliases=array['Hacked alias'] where id=current_setting('links_test.person')::uuid;get diagnostics affected=row_count;if affected>0 then raise exception 'Anonymous alias update accepted';end if;exception when insufficient_privilege then null;end;
 if (select prosecdef from pg_proc where oid='public.article_entity_candidates(text)'::regprocedure) or (select prosecdef from pg_proc where oid='public.entity_related_articles(text,uuid)'::regprocedure) then raise exception 'Link functions bypass row permissions';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;
begin
 begin insert into public.people(slug,name_en,status) values('links-forged-'||gen_random_uuid()::text,'Forbidden metadata role','published');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'User metadata granted staff access';end if;
end $test$;
rollback;
select jsonb_build_object('staff_profile_editing','passed','published_only_candidates','passed','alias_ambiguity','passed','related_published_coverage','passed','anonymous_writes','blocked','metadata_role_spoofing','blocked','fixtures','rolled back') as entity_links_verification;
