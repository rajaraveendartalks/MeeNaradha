-- Partner registrations are requests, never accounts or public articles.
create table private.publication_requests (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('MNR-'||upper(replace(gen_random_uuid()::text,'-',''))),
 submission_key uuid not null unique, payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 applicant_type text not null check(applicant_type in ('production_house','studio','creator')),
 organisation_name text not null check(length(btrim(organisation_name)) between 2 and 160),
 contact_name text not null check(length(btrim(contact_name)) between 2 and 100),
 email text not null check(length(email) between 5 and 254 and email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'),
 phone text not null default '' check(length(phone)<=40 and (phone='' or (phone ~ '^[+0-9().[:space:]-]+$' and length(regexp_replace(phone,'[^0-9]','','g')) between 7 and 18))),
 official_url text not null default '' check(length(official_url)<=2048 and (official_url='' or official_url ~ '^https?://[^/?#@[:space:]]+')),
 article_title text not null check(length(btrim(article_title)) between 6 and 240),
 article_language text not null check(article_language in ('te','en')),
 category text not null references public.content_categories(slug),
 content_type text not null check(content_type in ('article','press_release','announcement','interview')),
 summary text not null default '' check(length(summary)<=1000),
 article_body text not null default '' check(length(article_body)<=30000),
 article_url text not null default '' check(length(article_url)<=2048 and (article_url='' or article_url ~ '^https?://[^/?#@[:space:]]+')),
 media_url text not null default '' check(length(media_url)<=2048 and (media_url='' or media_url ~ '^https?://[^/?#@[:space:]]+')),
 preferred_date text not null default '', rights_confirmed boolean not null check(rights_confirmed),
 contact_consent boolean not null check(contact_consent),
 status text not null default 'submitted' check(status in ('submitted','in_review','needs_changes','accepted','declined','draft_created')),
 internal_notes text not null default '' check(length(internal_notes)<=4000),
 article_id uuid unique references public.news_articles(id) on delete set null,
 reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
 revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(btrim(article_body))>=80 or article_url<>'')
);
create index publication_requests_status_date_idx on private.publication_requests(status,created_at desc,id desc);
create index publication_requests_created_idx on private.publication_requests(created_at desc,id desc);
create index publication_requests_reviewer_idx on private.publication_requests(reviewed_by);
create table private.publication_ingest_config(id boolean primary key default true check(id),salt text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''));
create table private.publication_request_limits(identity_hash text not null check(identity_hash ~ '^[a-f0-9]{64}$'),kind text not null check(kind in ('ip','email')),bucket timestamptz not null,hits integer not null,primary key(identity_hash,kind,bucket));
alter table private.publication_requests enable row level security;
alter table private.publication_ingest_config enable row level security;
alter table private.publication_request_limits enable row level security;
revoke all on private.publication_requests,private.publication_ingest_config,private.publication_request_limits from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.publication_ingest_config to service_role;
grant select,insert,update,delete on private.publication_requests,private.publication_request_limits to service_role;
insert into private.publication_ingest_config(id) values(true);

create function public.publishing_request_ingest_config() returns text language sql stable security invoker set search_path='' as $$select salt from private.publication_ingest_config where id$$;
create function public.submit_publication_request(p_form jsonb,p_key uuid,p_client_hash text,p_email_hash text,p_payload_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare existing private.publication_requests; saved private.publication_requests; current_hits integer; field text;
begin
 if p_key is null or p_client_hash is null or p_email_hash is null or p_payload_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$' or p_payload_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid submission identity' using errcode='22023';end if;
 -- Serialise retries with the same idempotency key before touching rate limits.
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into existing from private.publication_requests where submission_key=p_key;
 if found then
  if existing.payload_hash<>p_payload_hash then raise exception 'Submission key already used' using errcode='P0409';end if;
  return jsonb_build_object('reference',existing.reference,'received_at',existing.created_at);
 end if;
 if p_form is null or jsonb_typeof(p_form)<>'object' or octet_length(p_form::text)>131072 then raise exception 'Invalid form' using errcode='22023';end if;
 foreach field in array array['applicant_type','organisation_name','contact_name','email','phone','official_url','article_title','article_language','category','content_type','summary','article_body','article_url','media_url','preferred_date'] loop
  if jsonb_typeof(p_form->field) is distinct from 'string' then raise exception 'Invalid form field' using errcode='22023';end if;
 end loop;
 if p_form->'rights_confirmed' is distinct from 'true'::jsonb or p_form->'contact_consent' is distinct from 'true'::jsonb then raise exception 'Content permission and contact consent required' using errcode='22023';end if;
 if not exists(select 1 from public.content_categories where slug=p_form->>'category' and is_active) then raise exception 'Choose an active category' using errcode='22023';end if;
 if p_form->>'preferred_date'<>'' then
  begin
   if p_form->>'preferred_date' !~ '^\d{4}-\d{2}-\d{2}$' or (p_form->>'preferred_date')::date<(now() at time zone 'Asia/Kolkata')::date then raise exception 'Invalid preferred date' using errcode='22023';end if;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Invalid preferred date' using errcode='22023';end;
 end if;
 insert into private.publication_request_limits(identity_hash,kind,bucket,hits) values(p_client_hash,'ip',date_trunc('hour',clock_timestamp()),1)
 on conflict(identity_hash,kind,bucket) do update set hits=private.publication_request_limits.hits+1 where private.publication_request_limits.hits<10 returning hits into current_hits;
 if current_hits is null then raise exception 'Submission rate exceeded' using errcode='P0429';end if;
 current_hits:=null;
 insert into private.publication_request_limits(identity_hash,kind,bucket,hits) values(p_email_hash,'email',date_trunc('day',clock_timestamp() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata',1)
 on conflict(identity_hash,kind,bucket) do update set hits=private.publication_request_limits.hits+1 where private.publication_request_limits.hits<20 returning hits into current_hits;
 if current_hits is null then raise exception 'Submission rate exceeded' using errcode='P0429';end if;
 begin
  insert into private.publication_requests(submission_key,payload_hash,applicant_type,organisation_name,contact_name,email,phone,official_url,article_title,article_language,category,content_type,summary,article_body,article_url,media_url,preferred_date,rights_confirmed,contact_consent)
  values(p_key,p_payload_hash,p_form->>'applicant_type',btrim(p_form->>'organisation_name'),btrim(p_form->>'contact_name'),lower(btrim(p_form->>'email')),btrim(p_form->>'phone'),p_form->>'official_url',btrim(p_form->>'article_title'),p_form->>'article_language',p_form->>'category',p_form->>'content_type',p_form->>'summary',p_form->>'article_body',p_form->>'article_url',p_form->>'media_url',p_form->>'preferred_date',true,true) returning * into saved;
 exception when check_violation or not_null_violation or foreign_key_violation then raise exception 'Invalid form details' using errcode='22023';end;
 if random()<0.01 then delete from private.publication_request_limits where bucket<now()-interval '2 days';end if;
 return jsonb_build_object('reference',saved.reference,'received_at',saved.created_at);
end $$;
revoke all on function public.publishing_request_ingest_config(),public.submit_publication_request(jsonb,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.publishing_request_ingest_config(),public.submit_publication_request(jsonb,uuid,text,text,text) to service_role;

create function private.studio_require_publication_staff() returns public.app_role language plpgsql stable security definer set search_path='' as $$
declare app_role public.app_role:=private.current_app_role();
begin
 if (select auth.uid()) is null or app_role not in ('admin','editor') then raise exception 'Editor access is required' using errcode='42501';end if;
 return app_role;
end $$;
revoke all on function private.studio_require_publication_staff() from public,anon;
grant execute on function private.studio_require_publication_staff() to authenticated;

create function private.studio_list_publication_requests(p_status text default 'all',p_search text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.studio_require_publication_staff();
 if p_status is null or p_status not in ('all','submitted','in_review','needs_changes','accepted','declined','draft_created') or p_page is null or p_page<1 or p_page>100000 or p_search is null or length(p_search)>100 then raise exception 'Invalid request filter' using errcode='22023';end if;
 with filtered as (
  select id,reference,status,organisation_name,applicant_type,article_title,email,category,created_at,article_id,revision from private.publication_requests
  where (p_status='all' or status=p_status) and (p_search='' or strpos(lower(organisation_name||' '||article_title||' '||email||' '||reference),lower(p_search))>0)
 ), page as (select * from filtered order by created_at desc,id desc limit 25 offset (p_page-1)*25)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb),'count',(select count(*) from filtered)) into result;
 return result;
end $$;
create function public.studio_list_publication_requests(p_status text default 'all',p_search text default '',p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$select private.studio_list_publication_requests(p_status,p_search,p_page)$$;
create function private.studio_get_publication_request(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.studio_require_publication_staff();
 return (select to_jsonb(r)-'submission_key'-'payload_hash' from private.publication_requests r where id=p_id);
end $$;
create function public.studio_get_publication_request(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.studio_get_publication_request(p_id)$$;

create function private.studio_review_publication_request(p_id uuid,p_revision integer,p_status text,p_notes text) returns jsonb language plpgsql security definer set search_path='' as $$
declare app_role public.app_role:=private.studio_require_publication_staff(); saved private.publication_requests;
begin
 select * into saved from private.publication_requests where id=p_id for update;
 if not found then raise exception 'Request not found' using errcode='22023';end if;
 if p_revision is distinct from saved.revision then raise exception 'Request changed in another session' using errcode='40001';end if;
 if p_notes is null or length(p_notes)>4000 or p_status is null or p_status not in ('submitted','in_review','needs_changes','accepted','declined','draft_created') then raise exception 'Invalid review' using errcode='22023';end if;
 if p_status<>saved.status then
  if saved.article_id is not null or saved.status='draft_created' then raise exception 'This request already has an article draft' using errcode='22023';end if;
  if p_status='draft_created' then raise exception 'Use Create article draft' using errcode='22023';end if;
  if app_role<>'admin' and (p_status not in ('in_review','needs_changes') or saved.status not in ('submitted','in_review','needs_changes')) then raise exception 'Administrator approval is required' using errcode='42501';end if;
 end if;
 update private.publication_requests set status=p_status,internal_notes=btrim(p_notes),reviewed_by=(select auth.uid()),reviewed_at=clock_timestamp(),updated_at=clock_timestamp(),revision=revision+1 where id=p_id returning * into saved;
 return to_jsonb(saved)-'submission_key'-'payload_hash';
end $$;
create function public.studio_review_publication_request(p_id uuid,p_revision integer,p_status text,p_notes text) returns jsonb language sql security invoker set search_path='' as $$select private.studio_review_publication_request(p_id,p_revision,p_status,p_notes)$$;

create function private.studio_publication_request_draft(p_id uuid,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved private.publication_requests; draft_id uuid; plain_document text;
begin
 perform private.studio_require_publication_staff();
 select * into saved from private.publication_requests where id=p_id for update;
 if not found then raise exception 'Request not found' using errcode='22023';end if;
 -- A retried click returns the existing draft, never a second article.
 if saved.article_id is not null then return jsonb_build_object('article_id',saved.article_id);end if;
 if p_revision is distinct from saved.revision then raise exception 'Request changed in another session' using errcode='40001';end if;
 if saved.status<>'accepted' then raise exception 'An administrator must accept this request first' using errcode='42501';end if;
 -- Encode submitted text as text nodes, never interpret submitted HTML or editor JSON.
 if saved.article_body<>'' then
  select 'MNRICH1:'||jsonb_build_object('type','doc','content',jsonb_agg(jsonb_build_object('type','paragraph','content',jsonb_build_array(jsonb_build_object('type','text','text',paragraph))) order by position))::text into plain_document
  from regexp_split_to_table(replace(saved.article_body,E'\r\n',E'\n'),E'\n\n+') with ordinality as parts(paragraph,position);
 end if;
 insert into public.news_articles(slug,headline_en,headline_te,dek_en,dek_te,body_en,body_te,category,source_name,source_url,status,published_at,author_id)
 values('partner-'||replace(saved.id::text,'-',''),saved.article_title,case when saved.article_language='te' then saved.article_title end,case when saved.article_language='en' then nullif(saved.summary,'') end,case when saved.article_language='te' then nullif(saved.summary,'') end,case when saved.article_language='en' then plain_document end,case when saved.article_language='te' then plain_document end,saved.category,saved.organisation_name,nullif(saved.article_url,''),'draft',null,(select auth.uid())) returning id into draft_id;
 update private.publication_requests set article_id=draft_id,status='draft_created',reviewed_by=(select auth.uid()),reviewed_at=clock_timestamp(),updated_at=clock_timestamp(),revision=revision+1 where id=p_id;
 return jsonb_build_object('article_id',draft_id);
end $$;
create function public.studio_publication_request_draft(p_id uuid,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$select private.studio_publication_request_draft(p_id,p_revision)$$;
revoke all on function private.studio_list_publication_requests(text,text,integer),public.studio_list_publication_requests(text,text,integer),private.studio_get_publication_request(uuid),public.studio_get_publication_request(uuid),private.studio_review_publication_request(uuid,integer,text,text),public.studio_review_publication_request(uuid,integer,text,text),private.studio_publication_request_draft(uuid,integer),public.studio_publication_request_draft(uuid,integer) from public,anon;
grant execute on function private.studio_list_publication_requests(text,text,integer),public.studio_list_publication_requests(text,text,integer),private.studio_get_publication_request(uuid),public.studio_get_publication_request(uuid),private.studio_review_publication_request(uuid,integer,text,text),public.studio_review_publication_request(uuid,integer,text,text),private.studio_publication_request_draft(uuid,integer),public.studio_publication_request_draft(uuid,integer) to authenticated;
