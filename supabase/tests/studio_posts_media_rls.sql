-- Run against a project with an existing editor/admin. All fixtures are rolled back.
begin;
select set_config('request.jwt.claims',jsonb_build_object(
  'sub',(select user_id from public.user_roles where role in ('admin','editor') order by role::text limit 1),
  'role','authenticated'
)::text,true);
set local role authenticated;
do $test$
declare article_id uuid; image_id uuid; suffix text:=gen_random_uuid()::text;
begin
  insert into public.news_articles(slug,headline_en,headline_te,body_te,category,status)
    values('studio-rls-'||suffix,'Studio transaction test','స్టూడియో పరీక్ష','Transaction-only test content.','movies','draft')
    returning id into article_id;
  update public.news_articles set status='in_review' where id=article_id;
  if not found then raise exception 'Staff cannot submit drafts for review'; end if;
  update public.news_articles set status='published',published_at=now() where id=article_id;
  if not exists(select 1 from public.news_articles where id=article_id and status='published' and published_at is not null) then
    raise exception 'Staff publish round trip failed';
  end if;
  update public.news_articles set status='archived' where id=article_id;
  if not exists(select 1 from public.news_articles where id=article_id and status='archived') then
    raise exception 'Soft trash round trip failed';
  end if;
  update public.news_articles set status='draft' where id=article_id;
  if not exists(select 1 from public.news_articles where id=article_id and status='draft') then
    raise exception 'Restore round trip failed';
  end if;
  insert into storage.objects(bucket_id,name)
    values('media','studio-rls-'||suffix||'.png') returning id into image_id;
  if not exists(select 1 from storage.objects where id=image_id) then raise exception 'Staff cannot browse uploaded media metadata'; end if;
  perform set_config('studio_test.article_id',article_id::text,true);
  perform set_config('studio_test.image_id',image_id::text,true);
end
$test$;
set local role anon;
do $test$
declare affected integer; insert_denied boolean:=false; media_rows integer:=0;
begin
  if exists(select 1 from public.news_articles where id=current_setting('studio_test.article_id')::uuid) then
    raise exception 'Anonymous reader can see a draft';
  end if;
  begin
    select count(*) into media_rows from storage.objects where id=current_setting('studio_test.image_id')::uuid;
  exception when insufficient_privilege then media_rows:=0;
  end;
  if media_rows>0 then raise exception 'Anonymous reader can browse private media metadata'; end if;
  begin
    insert into public.news_articles(slug,headline_en,status) values('studio-forbidden-'||gen_random_uuid()::text,'Forbidden test','draft');
  exception when insufficient_privilege then insert_denied:=true;
  end;
  if not insert_denied then raise exception 'Anonymous article insert was allowed'; end if;
  begin
    update public.news_articles set status='published' where id=current_setting('studio_test.article_id')::uuid;
    get diagnostics affected=row_count;
    if affected>0 then raise exception 'Anonymous article update was allowed'; end if;
  exception when insufficient_privilege then null;
  end;
end
$test$;
rollback;
select jsonb_build_object('staff_post_lifecycle','passed','staff_media_access','passed','anonymous_reads_and_writes','blocked','test_fixtures','rolled back') as studio_verification;
