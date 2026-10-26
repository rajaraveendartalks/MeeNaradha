// Run: NODE_PATH=<directory containing @electric-sql/pglite> node supabase/tests/creator-video-regression.cjs
// Isolated, synthetic PostgreSQL fixture. Never connects to Supabase.
const {PGlite}=require('@electric-sql/pglite');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const db=new PGlite();
 await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema private;
 create type public.app_role as enum ('user','editor','reviewer','admin');
 create type public.content_status as enum ('draft','published');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table user_roles(user_id uuid primary key,role app_role);
 create function private.current_app_role() returns app_role language sql stable set search_path='' as $$select coalesce((select role from public.user_roles where user_id=auth.uid()),'user'::public.app_role)$$;
 revoke all on function private.current_app_role() from public;
 grant usage on schema public,auth,private to anon,authenticated;
 grant execute on function private.current_app_role() to authenticated;
 create table creator_submissions(id uuid primary key,creator_id uuid,status text,content_type text,video_url text,title_en text,title_te text,description_en text,description_te text);
 create table videos(id uuid primary key default gen_random_uuid(),slug text unique,title_en text,title_te text,description_en text,description_te text,platform text,external_id text,video_url text,thumbnail_url text,status content_status,published_at timestamptz,creator_submission_id uuid unique references creator_submissions(id),content_type text);
 grant select on videos to anon;
 grant select,insert,update on videos,creator_submissions to authenticated;
 grant select on user_roles to authenticated;
 alter table videos enable row level security;
 alter table creator_submissions enable row level security;
 alter table user_roles enable row level security;
 create policy users_read_own_role on user_roles for select to authenticated using(user_id=auth.uid());
 create policy creator_read on creator_submissions for select to authenticated using(creator_id=auth.uid() or private.current_app_role() in ('editor','reviewer','admin'));
 create policy creator_update on creator_submissions for update to authenticated using(creator_id=auth.uid() and status in ('draft','changes_requested')) with check(creator_id=auth.uid() and status in ('draft','submitted'));
 create policy videos_read on videos for select to anon,authenticated using(status='published' or (select private.current_app_role()) in ('editor','admin'));
 create policy videos_insert on videos for insert to authenticated with check((select private.current_app_role()) in ('editor','admin'));
 create policy videos_update on videos for update to authenticated using((select private.current_app_role()) in ('editor','admin')) with check((select private.current_app_role()) in ('editor','admin'));
 insert into user_roles values ('00000000-0000-0000-0000-000000000001','admin'),('00000000-0000-0000-0000-000000000002','reviewer'),('00000000-0000-0000-0000-000000000003','user');
 insert into creator_submissions values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','approved','trailer','https://www.youtube.com/watch?v=Ra09pAJN9LI','Synthetic trailer',null,null,null),('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','submitted','trailer','https://www.youtube.com/watch?v=Ra09pAJN9LI','Unapproved trailer',null,null,null);
 insert into videos(slug,status) values('public-example','published'),('private-example','draft');
 `);
 await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/publish_creator_video_before_fix.sql'),'utf8'));
 async function as(role,id,sql){await db.exec('begin');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);await db.exec('set local role '+role);const result=await db.query(sql);await db.exec('commit');return result.rows}catch(e){await db.exec('rollback');throw e}}
 const publish="select public.publish_creator_video('10000000-0000-0000-0000-000000000001') as id";
 await assert.rejects(as('anon',null,"select * from videos where status='published'"),/permission denied for function current_app_role/);
 await assert.rejects(as('authenticated','00000000-0000-0000-0000-000000000001',publish),/Approved creator submission not found/);
 console.log('PASS: reproduced anonymous read failure and administrator row-lock failure');
 await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/20261026075730_fix_creator_video_public_read_and_publish.sql'),'utf8'));
 assert.equal((await as('anon',null,'select * from videos')).length,1);
 await assert.rejects(as('anon',null,publish),/permission denied/);
 for(const id of ['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'])await assert.rejects(as('authenticated',id,publish),/Administrator access required/);
 const admin='00000000-0000-0000-0000-000000000001';
 await assert.rejects(as('authenticated',admin,"select publish_creator_video('20000000-0000-0000-0000-000000000001')"),/Approved creator submission not found/);
 const first=await as('authenticated',admin,publish);const second=await as('authenticated',admin,publish);assert.equal(first[0].id,second[0].id);
 assert.equal((await as('anon',null,'select * from videos')).length,2);
 assert.equal((await as('anon',null,"select * from videos where slug='private-example'")).length,0);
 assert.equal((await as('authenticated',admin,"update creator_submissions set title_en='Forbidden edit' where status='approved' returning id")).length,0);
 assert.equal((await as('authenticated','00000000-0000-0000-0000-000000000003',"update creator_submissions set status='draft' where status='approved' returning id")).length,0);
 console.log('PASS: public-only anonymous reads; anonymous/reviewer/creator publish denied; unapproved publish denied; administrator publish and repeat publish succeed; approved edits remain blocked');
 await db.close();
})().catch(e=>{console.error(e);process.exit(1)});
