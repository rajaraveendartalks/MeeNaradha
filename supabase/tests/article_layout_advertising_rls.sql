-- All editorial selections, campaigns, contacts and role changes in this test roll back.
begin;
select set_config('ads_test.admin',(select user_id::text from public.user_roles where role='admin' limit 1),true);
select set_config('ads_test.editor',(select id::text from auth.users where id<>current_setting('ads_test.admin')::uuid limit 1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ads_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.studio_set_user_role(current_setting('ads_test.editor')::uuid,'editor');
do $test$
declare article uuid;other_article uuid;draft uuid;gallery uuid;trailer uuid;legacy_trailer uuid;song uuid;campaign uuid;config jsonb;version integer;blocked boolean:=false;
begin
 insert into public.news_articles(slug,headline_en,body_en,category,status,published_at) values('ads-article-'||gen_random_uuid(),'Rolled-back ad article',repeat('Article paragraph. ',100),'movies','published',now()) returning id into article;
 insert into public.news_articles(slug,headline_en,body_en,category,status,published_at) values('ads-related-'||gen_random_uuid(),'Rolled-back related story','Related content','movies','published',now()) returning id into other_article;
 insert into public.news_articles(slug,headline_en,body_en,category,status) values('ads-draft-'||gen_random_uuid(),'Private draft','Draft content','movies','draft') returning id into draft;
 insert into public.image_galleries(slug,title_en,status,published_at) values('ads-gallery-'||gen_random_uuid(),'Rolled-back selected gallery','published',now()) returning id into gallery;
 insert into public.videos(slug,title_en,content_type,video_url,status,published_at) values('ads-trailer-'||gen_random_uuid(),'Rolled-back selected trailer','trailer','https://www.youtube.com/watch?v=dQw4w9WgXc','published',now()) returning id into trailer;
 insert into public.videos(slug,title_en,content_type,video_url,status,published_at) values('ads-legacy-trailer-'||gen_random_uuid(),'Rolled-back legacy trailer',null,'https://www.youtube.com/watch?v=dQw4w9WgXc','published',now()) returning id into legacy_trailer;
 insert into public.videos(slug,title_en,content_type,video_url,status,published_at) values('ads-song-'||gen_random_uuid(),'Rolled-back song','song','https://www.youtube.com/watch?v=dQw4w9WgXc','published',now()) returning id into song;
 perform set_config('ads_test.article',article::text,true);perform set_config('ads_test.draft',draft::text,true);
 config:=jsonb_build_object('enabled',true,'modules',jsonb_build_array(jsonb_build_object('kind','stories','title','Manual stories','enabled',true,'ids',jsonb_build_array(other_article,article)),jsonb_build_object('kind','galleries','title','Featured gallery','enabled',true,'ids',jsonb_build_array(gallery)),jsonb_build_object('kind','trailers','title','Featured trailer','enabled',true,'ids',jsonb_build_array(trailer,legacy_trailer))));
 select revision into version from public.article_sidebar_layouts where id='default';
 perform set_config('ads_test.config',config::text,true);
 update public.article_sidebar_layouts set config=current_setting('ads_test.config')::jsonb where id='default' and revision=version;
 if (select revision from public.article_sidebar_layouts where id='default')<>version+1 then raise exception 'Sidebar save did not advance revision';end if;
 update public.article_sidebar_layouts set use_default=false where id='default' and revision=version;
 if found then raise exception 'Stale sidebar save accepted';end if;
 insert into public.article_sidebar_layouts(id,article_id,use_default,config) values(article::text,article,false,config);
 insert into public.article_sidebar_layouts(id,article_id,use_default,config) values(draft::text,draft,false,config);
 begin update public.article_sidebar_layouts set config=jsonb_set(current_setting('ads_test.config')::jsonb,'{modules,0,ids}',jsonb_build_array(draft)) where id=article::text;exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Unpublished sidebar story accepted';end if;
 blocked:=false;begin update public.article_sidebar_layouts set config=jsonb_set(current_setting('ads_test.config')::jsonb,'{modules,2,ids}',jsonb_build_array(song)) where id=article::text;exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Classified song accepted as a trailer';end if;
 blocked:=false;begin update public.site_ad_settings as s set config=jsonb_set(s.config,'{google_enabled}','true') where id='website';exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Google activation without configuration accepted';end if;
 for i in 1..4 loop
  insert into public.site_ad_campaigns(name,advertiser,image_url,mobile_image_url,destination_url,alt_text,placements,categories,devices,enabled,starts_at,ends_at)
  values('Rolled-back campaign '||i,'Test Brand','https://example.test/banner.webp','','https://example.test/landing','Test brand launch',array['article_header','article_sidebar','article_inline','home_header','home_feed'],array['movies'],array['desktop','mobile'],i<>2,
   case when i=3 then now()+interval '2 days' when i=4 then now()-interval '2 days' else now()-interval '1 hour' end,
   case when i=3 then now()+interval '3 days' when i=4 then now()-interval '1 day' else now()+interval '1 day' end) returning id into campaign;
  perform set_config('ads_test.campaign_'||i,campaign::text,true);
 end loop;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ads_test.editor'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;version integer;
begin
 select revision into version from public.article_sidebar_layouts where id=current_setting('ads_test.article');
 update public.article_sidebar_layouts set use_default=true where id=current_setting('ads_test.article') and revision=version;
 if not found then raise exception 'Editor could not switch article to default selections';end if;
 update public.article_sidebar_layouts set use_default=false where id=current_setting('ads_test.article');
 update public.site_ad_campaigns set enabled=false where id=current_setting('ads_test.campaign_1')::uuid;
 if found then raise exception 'Editor changed a campaign';end if;
 update public.site_ad_settings as s set config=jsonb_set(s.config,'{google_enabled}','true') where id='website';
 if found then raise exception 'Editor changed ad settings';end if;
 if exists(select 1 from public.site_ad_campaigns where id=current_setting('ads_test.campaign_2')::uuid) then raise exception 'Editor read paused campaign';end if;
 begin perform public.studio_advertiser_enquiries('list');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor read private advertiser inbox';end if;
 blocked:=false;begin perform public.studio_ad_report(current_date,current_date);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Editor read advertising reports';end if;
end $test$;
set local role service_role;
do $test$
declare active_id uuid:=current_setting('ads_test.campaign_1')::uuid;article uuid:=current_setting('ads_test.article')::uuid;receipt jsonb;retry jsonb;key uuid:=gen_random_uuid();form jsonb;enquiry uuid;blocked boolean:=false;
begin
 if length(public.advertising_ingest_config())<>64 then raise exception 'Advertising salt unavailable';end if;
 if not public.record_ad_event(active_id,'article_sidebar','impression',repeat('a',64),repeat('b',64),article,'politics','desktop') then raise exception 'Active direct banner display failed';end if;
 perform public.record_ad_event(active_id,'article_sidebar','impression',repeat('a',64),repeat('b',64),article,'movies','desktop');
 perform public.record_ad_event(active_id,'article_sidebar','viewable',repeat('a',64),repeat('b',64),article,'movies','desktop');
 perform public.record_ad_event(active_id,'article_sidebar','click',repeat('a',64),repeat('b',64),article,'movies','desktop');
 if (select count(*) from private.ad_events where campaign_id=active_id)<>3 then raise exception 'Banner events did not deduplicate';end if;
 for i in 2..4 loop if public.record_ad_event(current_setting('ads_test.campaign_'||i)::uuid,'article_sidebar','impression',repeat('a',64),repeat('b',64),article,'movies','desktop') then raise exception 'Paused, future or expired campaign accepted event';end if;end loop;
 if public.record_ad_event(active_id,'article_sidebar','impression',repeat('f',64),repeat('b',64),current_setting('ads_test.draft')::uuid,'movies','desktop') then raise exception 'Draft article accepted ad telemetry';end if;
 if public.record_ad_event(active_id,'home_feed','click',repeat('d',64),repeat('b',64),null,'politics','mobile') then raise exception 'Category target bypassed';end if;
 perform public.record_ad_event(active_id,'home_feed','click',repeat('d',64),repeat('b',64),null,'movies','mobile');
 for i in 1..120 loop perform public.record_ad_event(active_id,'article_sidebar','impression',repeat('e',64),repeat('f',64),article,'movies','desktop');end loop;
 if public.record_ad_event(active_id,'article_sidebar','click',repeat('e',64),repeat('f',64),article,'movies','desktop') then raise exception 'Banner rate limit failed';end if;
 form:=jsonb_build_object('company','Rolled-back Advertiser','contact_name','Test Contact','email','ad-test@example.test','phone','','website','https://example.test','goal','movie_promotion','placement_interest','article_sidebar','budget','To discuss','start_date','','end_date','','brief','An isolated campaign enquiry for the permission test.','media_url','','contact_consent',true);
 receipt:=public.submit_advertiser_enquiry(form,key,repeat('1',64),repeat('2',64),repeat('3',64));
 retry:=public.submit_advertiser_enquiry(form,key,repeat('1',64),repeat('2',64),repeat('3',64));
 if retry<>receipt or receipt?'email' or receipt?'id' then raise exception 'Enquiry retry receipt incorrect';end if;
 select id into enquiry from private.advertiser_enquiries where submission_key=key;perform set_config('ads_test.enquiry',enquiry::text,true);
 begin perform public.submit_advertiser_enquiry(form,key,repeat('1',64),repeat('2',64),repeat('4',64));exception when sqlstate 'P0409' then blocked:=true;end;
 if not blocked then raise exception 'Conflicting enquiry retry accepted';end if;
 blocked:=false;begin perform public.submit_advertiser_enquiry(jsonb_set(form,'{contact_consent}','false'),gen_random_uuid(),repeat('1',64),repeat('2',64),repeat('3',64));exception when invalid_parameter_value then blocked:=true;end;
 if not blocked then raise exception 'Missing contact permission accepted';end if;
 for i in 1..9 loop perform public.submit_advertiser_enquiry(form,gen_random_uuid(),repeat('1',64),repeat('2',64),repeat('3',64));end loop;
 blocked:=false;begin perform public.submit_advertiser_enquiry(form,gen_random_uuid(),repeat('1',64),repeat('2',64),repeat('3',64));exception when sqlstate 'P0429' then blocked:=true;end;
 if not blocked then raise exception 'Enquiry rate limit failed';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('ads_test.admin'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare row jsonb;report jsonb;campaign jsonb;blocked boolean:=false;today date:=(now() at time zone 'Asia/Kolkata')::date;
begin
 row:=public.studio_advertiser_enquiries('get',current_setting('ads_test.enquiry')::uuid);
 if row->>'email'<>'ad-test@example.test' or row?'submission_key' or row?'payload_hash' then raise exception 'Admin enquiry detail incorrect';end if;
 row:=public.studio_advertiser_enquiries('review',current_setting('ads_test.enquiry')::uuid,0,'booked','Private booking notes');
 if row->>'status'<>'booked' or (row->>'revision')::integer<>1 then raise exception 'Booking follow-up did not save';end if;
 begin perform public.studio_advertiser_enquiries('review',current_setting('ads_test.enquiry')::uuid,0,'closed','Stale');exception when serialization_failure then blocked:=true;end;
 if not blocked then raise exception 'Stale advertiser review accepted';end if;
 if (public.studio_advertiser_enquiries('list',null,null,'booked','','Rolled-back Advertiser',1)->>'count')::integer<1 then raise exception 'Enquiry search failed';end if;
 report:=public.studio_ad_report(today,today);
 select value into campaign from jsonb_array_elements(report->'campaigns') where value->>'campaign_id'=current_setting('ads_test.campaign_1');
 if (campaign->>'impressions')::integer<>3 or (campaign->>'viewable')::integer<>1 or (campaign->>'clicks')::integer<>2 then raise exception 'Direct banner report counts incorrect: %',campaign;end if;
 if has_table_privilege(current_user,'private.ad_events','SELECT') or has_table_privilege(current_user,'private.advertiser_enquiries','SELECT') then raise exception 'Raw private data granted to browser';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;
begin
 update public.article_sidebar_layouts set use_default=true where id=current_setting('ads_test.article');if found then raise exception 'Non-staff changed sidebar';end if;
 begin perform public.studio_advertiser_enquiries('get',current_setting('ads_test.enquiry')::uuid);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Forged metadata accessed private inbox';end if;
end $test$;
set local role anon;
do $test$
declare blocked boolean:=false;
begin
 if not exists(select 1 from public.site_ad_campaigns where id=current_setting('ads_test.campaign_1')::uuid) then raise exception 'Public active campaign missing';end if;
 if exists(select 1 from public.site_ad_campaigns where id in(current_setting('ads_test.campaign_2')::uuid,current_setting('ads_test.campaign_3')::uuid,current_setting('ads_test.campaign_4')::uuid)) then raise exception 'Inactive campaign leaked';end if;
 if exists(select 1 from public.article_sidebar_layouts where id=current_setting('ads_test.draft')) then raise exception 'Draft article sidebar exposed';end if;
 if has_function_privilege(current_user,'public.submit_advertiser_enquiry(jsonb,uuid,text,text,text)','EXECUTE') or has_function_privilege(current_user,'public.record_ad_event(uuid,text,text,text,text,uuid,text,text)','EXECUTE') then raise exception 'Anonymous role bypassed ingest';end if;
 begin perform public.studio_advertiser_enquiries('get',current_setting('ads_test.enquiry')::uuid);exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous contact detail leak';end if;
end $test$;
rollback;
select jsonb_build_object('manual_story_gallery_trailer_selection','passed','per_article_defaults','passed','published_only','passed','campaign_schedule_and_targeting','passed','admin_only_ads_and_contacts','passed','retry_and_conflicts','passed','banner_dedup_and_reports','passed','rate_limits','passed','fixtures','rolled back') as advertising_verification;
