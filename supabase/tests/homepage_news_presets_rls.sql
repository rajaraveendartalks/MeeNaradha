-- Transaction-only fixtures. No article, review, movie, gallery or homepage edit persists.
begin;
select set_config('presets_test.staff',(select user_id::text from public.user_roles where role in ('admin','editor') limit 1),true);
-- Production gallery triggers also enforce administrator approval for fixture inserts.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id::text from public.user_roles where role='admin' limit 1),'role','authenticated')::text,true);
do $test$
declare suffix text:=gen_random_uuid()::text;movie uuid;hidden_movie uuid;review uuid;hidden_review uuid;private_parent_review uuid;gallery uuid;hidden_gallery uuid;story uuid;second_story uuid;ott uuid;hidden_ott uuid;
begin
 insert into public.movies(slug,title_en,status,poster_url) values('presets-movie-'||suffix,'Transaction-only public movie','published','https://example.test/public-movie.jpg') returning id into movie;
 insert into public.movies(slug,title_en,status,poster_url) values('presets-hidden-movie-'||suffix,'Private movie metadata','draft','https://example.test/private-movie.jpg') returning id into hidden_movie;
 insert into public.ott_titles(slug,title_en,status,movie_id) values('presets-ott-'||suffix,'Published OTT title','published',movie) returning id into ott;
 insert into public.ott_titles(slug,title_en,status,movie_id) values('presets-hidden-ott-'||suffix,'Private OTT metadata','draft',movie) returning id into hidden_ott;
 insert into public.reviews(slug,title_en,movie_id,status,rating,body_te) values('presets-review-'||suffix,'Transaction-only published review',movie,'published',7,'Review body') returning id into review;
 insert into public.reviews(slug,title_en,movie_id,status,rating,body_te) values('presets-hidden-review-'||suffix,'Private review',movie,'draft',null,'Private body') returning id into hidden_review;
 insert into public.reviews(slug,title_en,movie_id,status,rating) values('presets-private-parent-'||suffix,'Published review with private parent',hidden_movie,'published',0) returning id into private_parent_review;
 insert into public.image_galleries(slug,title_en,status) values('presets-gallery-'||suffix,'Published gallery','published') returning id into gallery;
 insert into public.image_galleries(slug,title_en,status) values('presets-hidden-gallery-'||suffix,'Private gallery','draft') returning id into hidden_gallery;
 insert into public.news_articles(slug,headline_en,body_te,category,status) values('presets-story-'||suffix,'Transaction-only first story','Body','movies','published') returning id into story;
 insert into public.news_articles(slug,headline_en,body_te,category,status) values('presets-second-story-'||suffix,'Transaction-only second story','Body','movies','published') returning id into second_story;
 perform set_config('presets_test.review',review::text,true);perform set_config('presets_test.hidden_review',hidden_review::text,true);perform set_config('presets_test.private_parent',private_parent_review::text,true);perform set_config('presets_test.gallery',gallery::text,true);perform set_config('presets_test.hidden_gallery',hidden_gallery::text,true);perform set_config('presets_test.story',story::text,true);perform set_config('presets_test.second_story',second_story::text,true);
 perform set_config('presets_test.ott',ott::text,true);perform set_config('presets_test.hidden_ott',hidden_ott::text,true);
end $test$;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $test$
declare image text;score numeric;visible integer;
begin
 select count(*) into visible from public.reviews where id in(current_setting('presets_test.review')::uuid,current_setting('presets_test.hidden_review')::uuid,current_setting('presets_test.private_parent')::uuid);
 if visible<>2 or exists(select 1 from public.reviews where id=current_setting('presets_test.hidden_review')::uuid) then raise exception 'Draft review leaked or public review unavailable';end if;
 select m.poster_url into image from public.reviews r left join public.movies m on m.id=r.movie_id where r.id=current_setting('presets_test.private_parent')::uuid;
 if image is not null then raise exception 'Private parent movie art leaked';end if;
 if not exists(select 1 from public.ott_titles where id=current_setting('presets_test.ott')::uuid) or exists(select 1 from public.ott_titles where id=current_setting('presets_test.hidden_ott')::uuid) then raise exception 'OTT published-only reads incorrect';end if;
 select rating into score from public.reviews where id=current_setting('presets_test.private_parent')::uuid;if score<>0 then raise exception 'Zero rating lost';end if;
 if not exists(select 1 from public.image_galleries where id=current_setting('presets_test.gallery')::uuid) or exists(select 1 from public.image_galleries where id=current_setting('presets_test.hidden_gallery')::uuid) then raise exception 'Gallery public access incorrect';end if;
 if exists(select 1 from public.homepage_settings where id='draft') then raise exception 'Homepage draft leaked';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('presets_test.staff'),'role','authenticated')::text,true);
set local role authenticated;
do $test$
declare draft public.homepage_settings;live public.homepage_settings;config jsonb;result jsonb;blocked boolean:=false;
begin
 select * into draft from public.homepage_settings where id='draft';select * into live from public.homepage_settings where id='published';
 config:=jsonb_set(draft.config,'{sections}',(select jsonb_agg(case when item->>'id'='movies' then item||jsonb_build_object('preset','feature-rows','selection','curated','storyIds',jsonb_build_array(current_setting('presets_test.second_story'),current_setting('presets_test.story'))) else item end) from jsonb_array_elements(draft.config->'sections')item));
 result:=public.save_homepage_settings(config,draft.revision,live.revision,false);
 if (select settings.config from public.homepage_settings settings where id='published') is distinct from live.config then raise exception 'Curated draft changed public homepage';end if;
 if (select item->'storyIds' from jsonb_array_elements(result->'draft'->'config'->'sections')item where item->>'id'='movies')->>0<>current_setting('presets_test.second_story') then raise exception 'Story ordering lost';end if;
 begin perform public.save_homepage_settings(config,draft.revision,live.revision,true);exception when serialization_failure then blocked:=true;end;if not blocked then raise exception 'Stale homepage save allowed';end if;
 result:=public.save_homepage_settings(config,(result->'draft'->>'revision')::integer,live.revision,true);if result->'published'->'config' is distinct from config then raise exception 'Curated homepage publication failed';end if;
end $test$;
set local role postgres;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
set local role authenticated;
do $test$
declare blocked boolean:=false;
begin
 if exists(select 1 from public.reviews where id=current_setting('presets_test.hidden_review')::uuid) then raise exception 'Non-editor read draft review';end if;
 begin perform public.save_homepage_settings('{"version":1}',0,0,true);exception when insufficient_privilege then blocked:=true;end;if not blocked then raise exception 'User metadata granted publication access';end if;
end $test$;
rollback;
select jsonb_build_object('published_review_reads','passed','draft_reviews_and_galleries','hidden','unpublished_parent_art','hidden','zero_rating','preserved','curated_draft_and_publish','passed','stale_save','blocked','metadata_authorization','blocked','test_changes','rolled back') as homepage_presets_verification;
