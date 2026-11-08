-- Staff/admin controls and anonymous isolation. Every fixture/change is rolled back.
begin;
select set_config('studio_test.admin',(select user_id::text from public.user_roles where role='admin' limit 1),true);
select set_config('studio_test.editor',(select u.id::text from auth.users u where u.id<>current_setting('studio_test.admin')::uuid and not exists(select 1 from public.user_roles r where r.user_id=u.id and role='admin') limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('studio_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare result jsonb;d public.site_navigation%rowtype;p public.site_navigation%rowtype;changed jsonb;blocked boolean:=false;target uuid:=current_setting('studio_test.editor')::uuid;
begin
 result:=public.studio_list_users('',1);
 if jsonb_array_length(result->'items')<1 then raise exception 'Admin cannot list accounts';end if;
 perform public.studio_set_user_role(target,'editor');
 begin perform public.studio_set_user_role(current_setting('studio_test.admin')::uuid,'user');exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Self-demotion was allowed';end if;
 select * into d from public.site_navigation where id='draft';select * into p from public.site_navigation where id='published';
 changed:=jsonb_set(d.config,'{menus,main,0,label}',to_jsonb('Transaction-only menu test'::text));
 result:=public.save_site_navigation(changed,d.revision,p.revision,false);
 if (select config from public.site_navigation where id='published')<>p.config then raise exception 'A menu draft changed public navigation';end if;
 blocked:=false;
 begin perform public.save_site_navigation(changed,d.revision,p.revision,true);exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'A stale menu update was accepted';end if;
 result:=public.save_site_navigation(changed,(result->'draft'->>'revision')::integer,p.revision,true);
 if result->'draft'->'config'<>changed or result->'published'->'config'<>changed then raise exception 'Atomic menu publish failed';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('studio_test.editor'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;suffix text:='studio-test-'||substr(gen_random_uuid()::text,1,8);version integer;
begin
 insert into public.content_categories(slug,name_en,name_te) values(suffix,'Transaction category','పరీక్ష');
 update public.content_categories set name_en='Edited test category',is_active=false where slug=suffix returning revision into version;
 if version<>1 then raise exception 'Category revision did not advance';end if;
 begin update public.content_categories set slug=suffix||'-changed' where slug=suffix;exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'An existing category slug changed';end if;
 if (select count(*) from public.site_navigation)<>1 then raise exception 'Editor can read private menu draft';end if;
 blocked:=false;
 begin perform public.studio_list_users('',1);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor can list private auth accounts';end if;
 blocked:=false;
 begin perform public.studio_set_user_role(current_setting('studio_test.editor')::uuid,'admin');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'An editor escalated their role';end if;
 blocked:=false;
 begin perform public.save_site_navigation('{"version":1}',0,0,true);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor can publish menus';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;
begin
 begin insert into public.content_categories(slug,name_en) values('forbidden-test','Forbidden');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'A non-editor created a category';end if;
 blocked:=false;
 begin perform public.studio_list_users('',1);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'A non-editor read auth accounts';end if;
end $test$;
set local role anon;
do $test$
declare blocked boolean:=false;
begin
 if (select count(*) from public.site_navigation)<>1 or exists(select 1 from public.site_navigation where id='draft') then raise exception 'Anonymous menu draft leak';end if;
 begin perform public.studio_list_users('',1);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous account listing was allowed';end if;
 if has_table_privilege(current_user,'public.content_categories','INSERT') or has_table_privilege(current_user,'public.site_navigation','UPDATE') then raise exception 'Anonymous write grants exist';end if;
end $test$;
rollback;
select jsonb_build_object('admin_accounts_and_roles','passed','self_demotion','blocked','editor_categories','passed','category_slug_changes','blocked','menu_drafts_and_publish','passed','stale_menu_save','blocked','editor_escalation','blocked','anonymous_and_non_staff_access','blocked','fixtures','rolled back') as management_verification;
