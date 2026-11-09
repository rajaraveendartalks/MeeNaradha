-- Manual article sidebars. Only published selections can be saved.
create table public.article_sidebar_layouts(
 id text primary key,article_id uuid unique references public.news_articles(id) on delete cascade,
 use_default boolean not null default false,config jsonb not null,revision integer not null default 0,
 updated_at timestamptz not null default now(),
 check(id=coalesce(article_id::text,'default')),check(id<>'default' or not use_default)
);
alter table public.article_sidebar_layouts enable row level security;
revoke all on public.article_sidebar_layouts from public,anon,authenticated;
grant select on public.article_sidebar_layouts to anon,authenticated;
grant insert,update on public.article_sidebar_layouts to authenticated;
create policy sidebar_public_read on public.article_sidebar_layouts for select to anon,authenticated using(article_id is null or exists(select 1 from public.news_articles where id=article_id and status='published'));
create policy sidebar_staff_read on public.article_sidebar_layouts for select to authenticated using((select private.current_app_role()) in ('admin','editor'));
create policy sidebar_staff_insert on public.article_sidebar_layouts for insert to authenticated with check((select private.current_app_role()) in ('admin','editor'));
create policy sidebar_staff_update on public.article_sidebar_layouts for update to authenticated using((select private.current_app_role()) in ('admin','editor')) with check((select private.current_app_role()) in ('admin','editor'));
create function private.guard_article_sidebar() returns trigger language plpgsql set search_path='' as $$
declare section jsonb;picked jsonb;kinds text[]:='{}';kind text;chosen uuid;seen text[];
begin
 if tg_op='UPDATE' and (new.id<>old.id or new.article_id is distinct from old.article_id) then raise exception 'Sidebar scope cannot be changed' using errcode='22023';end if;
 if jsonb_typeof(new.config) is distinct from 'object' or octet_length(new.config::text)>12000 or jsonb_typeof(new.config->'enabled') is distinct from 'boolean' or jsonb_typeof(new.config->'modules') is distinct from 'array' then raise exception 'Invalid sidebar configuration' using errcode='22023';end if;
 if jsonb_array_length(new.config->'modules')<>3 then raise exception 'Use three sidebar sections' using errcode='22023';end if;
 for section in select value from jsonb_array_elements(new.config->'modules') loop
  kind:=section->>'kind';
  if kind is null or kind not in ('stories','galleries','trailers') or kind=any(kinds) or jsonb_typeof(section->'enabled') is distinct from 'boolean' or jsonb_typeof(section->'title') is distinct from 'string' or length(btrim(section->>'title')) not between 1 and 80 or jsonb_typeof(section->'ids') is distinct from 'array' then raise exception 'Invalid sidebar section' using errcode='22023';end if;
  kinds:=array_append(kinds,kind);seen:='{}';
  if jsonb_array_length(section->'ids')> (case kind when 'stories' then 6 when 'galleries' then 3 else 2 end) then raise exception 'Too many sidebar items' using errcode='22023';end if;
  for picked in select value from jsonb_array_elements(section->'ids') loop
   if jsonb_typeof(picked)<>'string' or (picked#>>'{}') !~ '^[a-fA-F0-9-]{36}$' or (picked#>>'{}')=any(seen) then raise exception 'Invalid or duplicate selected item' using errcode='22023';end if;
   begin chosen:=(picked#>>'{}')::uuid;exception when invalid_text_representation then raise exception 'Invalid selected item' using errcode='22023';end;
   seen:=array_append(seen,picked#>>'{}');
   if (kind='stories' and not exists(select 1 from public.news_articles where id=chosen and status='published')) or (kind='galleries' and not exists(select 1 from public.image_galleries where id=chosen and status='published')) or (kind='trailers' and not exists(select 1 from public.videos where id=chosen and status='published' and content_type='trailer')) then raise exception 'Select published stories, galleries and trailers only' using errcode='22023';end if;
  end loop;
 end loop;
 new.revision:=case when tg_op='UPDATE' then old.revision+1 else 0 end;new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function private.guard_article_sidebar() from public,anon,authenticated;
create trigger guard_article_sidebar before insert or update on public.article_sidebar_layouts for each row execute function private.guard_article_sidebar();
-- A one-time starting selection of existing content; future selection is entirely manual.
insert into public.article_sidebar_layouts(id,config) values('default',jsonb_build_object('enabled',true,'modules',jsonb_build_array(
 jsonb_build_object('kind','stories','title','ఎడిటర్ ఎంపికలు','enabled',true,'ids',coalesce((select jsonb_agg(id order by published_at desc nulls last) from(select id,published_at from public.news_articles where status='published' order by published_at desc nulls last,id limit 4) picked),'[]'::jsonb)),
 jsonb_build_object('kind','galleries','title','ఫోటో గ్యాలరీలు','enabled',true,'ids',coalesce((select jsonb_agg(id order by created_at desc) from(select id,created_at from public.image_galleries where status='published' order by created_at desc,id limit 1) picked),'[]'::jsonb)),
 jsonb_build_object('kind','trailers','title','ట్రైలర్లు','enabled',true,'ids',coalesce((select jsonb_agg(id order by published_at desc nulls last) from(select id,published_at from public.videos where status='published' and content_type='trailer' order by published_at desc nulls last,id limit 1) picked),'[]'::jsonb))
)));

-- Public campaign records contain banner data only. Contacts and review notes stay private.
create table public.site_ad_settings(id text primary key check(id='website'),config jsonb not null,revision integer not null default 0,updated_at timestamptz not null default now());
create table public.site_ad_campaigns(
 id uuid primary key default gen_random_uuid(),name text not null check(length(btrim(name)) between 1 and 120),
 advertiser text not null check(length(btrim(advertiser)) between 1 and 120),
 image_url text not null check(length(image_url)<=2048 and image_url ~ '^https?://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'),
 mobile_image_url text not null default '' check(length(mobile_image_url)<=2048 and (mobile_image_url='' or mobile_image_url ~ '^https?://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$')),
 destination_url text not null check(length(destination_url)<=2048 and destination_url ~ '^https?://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'),
 alt_text text not null check(length(btrim(alt_text)) between 1 and 180),
 placements text[] not null check(cardinality(placements) between 1 and 5 and placements<@array['article_header','article_sidebar','article_inline','home_header','home_feed']),
 categories text[] not null default '{}' check(cardinality(categories)<=30),devices text[] not null default array['desktop','mobile'] check(cardinality(devices) between 1 and 2 and devices<@array['desktop','mobile']),
 priority integer not null default 10 check(priority between 0 and 1000),enabled boolean not null default false,
 starts_at timestamptz not null,ends_at timestamptz not null check(ends_at>starts_at),
 revision integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index site_ad_campaigns_schedule_idx on public.site_ad_campaigns(ends_at,starts_at) where enabled;
alter table public.site_ad_settings enable row level security;alter table public.site_ad_campaigns enable row level security;
revoke all on public.site_ad_settings,public.site_ad_campaigns from public,anon,authenticated;
grant select on public.site_ad_settings,public.site_ad_campaigns to anon,authenticated;
grant update on public.site_ad_settings to authenticated;
grant insert,update on public.site_ad_campaigns to authenticated;
create policy ad_settings_public_read on public.site_ad_settings for select to anon,authenticated using(true);
create policy ad_settings_admin_update on public.site_ad_settings for update to authenticated using((select private.current_app_role())='admin') with check((select private.current_app_role())='admin');
create policy campaigns_active_read on public.site_ad_campaigns for select to anon,authenticated using(enabled and starts_at<=now() and ends_at>now());
create policy campaigns_admin_read on public.site_ad_campaigns for select to authenticated using((select private.current_app_role())='admin');
create policy campaigns_admin_insert on public.site_ad_campaigns for insert to authenticated with check((select private.current_app_role())='admin');
create policy campaigns_admin_update on public.site_ad_campaigns for update to authenticated using((select private.current_app_role())='admin') with check((select private.current_app_role())='admin');
create function private.guard_ad_settings() returns trigger language plpgsql set search_path='' as $$
declare placement jsonb;ids text[]:='{}';slot text;
begin
 if new.id<>old.id or jsonb_typeof(new.config) is distinct from 'object' or octet_length(new.config::text)>12000 or jsonb_typeof(new.config->'publisher_id') is distinct from 'string' or jsonb_typeof(new.config->'google_enabled') is distinct from 'boolean' or jsonb_typeof(new.config->'consent_ready') is distinct from 'boolean' or jsonb_typeof(new.config->'placements') is distinct from 'array' then raise exception 'Invalid advertising settings' using errcode='22023';end if;
 if new.config->>'publisher_id'<>'' and new.config->>'publisher_id' !~ '^ca-pub-[0-9]{16}$' then raise exception 'Invalid publisher ID' using errcode='22023';end if;
 if jsonb_array_length(new.config->'placements')<>5 then raise exception 'Use five supported placements' using errcode='22023';end if;
 for placement in select value from jsonb_array_elements(new.config->'placements') loop
  slot:=placement->>'id';
  if slot is null or slot not in ('article_header','article_sidebar','article_inline','home_header','home_feed') or slot=any(ids) or jsonb_typeof(placement->'enabled') is distinct from 'boolean' or jsonb_typeof(placement->'desktop') is distinct from 'boolean' or jsonb_typeof(placement->'mobile') is distinct from 'boolean' or jsonb_typeof(placement->'google_slot') is distinct from 'string' or (placement->>'google_slot'<>'' and placement->>'google_slot' !~ '^[0-9]{5,20}$') then raise exception 'Invalid advertising placement' using errcode='22023';end if;
  ids:=array_append(ids,slot);
 end loop;
 if (new.config->>'google_enabled')::boolean and (new.config->>'publisher_id'='' or not (new.config->>'consent_ready')::boolean or not exists(select 1 from jsonb_array_elements(new.config->'placements') p where (p->>'enabled')::boolean and p->>'google_slot'<>'')) then raise exception 'Google approval, consent setup, publisher and slot IDs are required' using errcode='22023';end if;
 new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;
end $$;
create function private.guard_ad_campaign() returns trigger language plpgsql set search_path='' as $$
declare category text;
begin
 if tg_op='UPDATE' and new.id<>old.id then raise exception 'Campaign ID cannot change' using errcode='22023';end if;
 if cardinality(new.placements)<>(select count(distinct value) from unnest(new.placements) value) or cardinality(new.devices)<>(select count(distinct value) from unnest(new.devices) value) then raise exception 'Remove duplicate placements or devices' using errcode='22023';end if;
 foreach category in array new.categories loop if not exists(select 1 from public.content_categories where slug=category and is_active) then raise exception 'Choose active content categories' using errcode='22023';end if;end loop;
 new.revision:=case when tg_op='UPDATE' then old.revision+1 else 0 end;new.updated_at:=clock_timestamp();if tg_op='UPDATE' then new.created_at:=old.created_at;end if;return new;
end $$;
revoke all on function private.guard_ad_settings(),private.guard_ad_campaign() from public,anon,authenticated;
create trigger guard_ad_settings before update on public.site_ad_settings for each row execute function private.guard_ad_settings();
create trigger guard_ad_campaign before insert or update on public.site_ad_campaigns for each row execute function private.guard_ad_campaign();
insert into public.site_ad_settings(id,config) select 'website',jsonb_build_object('publisher_id','','google_enabled',false,'consent_ready',false,'placements',(select jsonb_agg(jsonb_build_object('id',id,'enabled',true,'desktop',true,'mobile',id<>'article_sidebar','google_slot','')) from unnest(array['article_header','article_sidebar','article_inline','home_header','home_feed']) id));

create table private.advertising_ingest_config(id boolean primary key default true check(id),salt text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''));
create table private.advertising_limits(identity_hash text not null check(identity_hash ~ '^[a-f0-9]{64}$'),kind text not null,bucket timestamptz not null,hits integer not null,primary key(identity_hash,kind,bucket));
create table private.ad_events(
 campaign_id uuid not null references public.site_ad_campaigns(id) on delete cascade,event_day date not null default (now() at time zone 'Asia/Kolkata')::date,
 placement text not null check(placement in ('article_header','article_sidebar','article_inline','home_header','home_feed')),
 kind text not null check(kind in ('impression','viewable','click')),display_hash text not null check(display_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),primary key(event_day,campaign_id,placement,kind,display_hash)
);
create index ad_events_campaign_day_idx on private.ad_events(campaign_id,event_day);
create table private.advertiser_enquiries(
 id uuid primary key default gen_random_uuid(),reference text not null unique default ('MNA-'||upper(replace(gen_random_uuid()::text,'-',''))),
 submission_key uuid not null unique,payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 company text not null check(length(btrim(company)) between 2 and 160),contact_name text not null check(length(btrim(contact_name)) between 2 and 100),
 email text not null check(length(email) between 5 and 254 and email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'),
 phone text not null default '' check(length(phone)<=40),website text not null default '' check(length(website)<=2048 and (website='' or website ~ '^https?://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$')),
 goal text not null check(goal in ('movie_promotion','brand_campaign','event','other')),
 placement_interest text not null default 'any' check(placement_interest in ('any','article_header','article_sidebar','article_inline','home_header','home_feed')),
 budget text not null default '' check(length(budget)<=80),start_date text not null default '',end_date text not null default '',
 brief text not null check(length(btrim(brief)) between 20 and 3000),
 media_url text not null default '' check(length(media_url)<=2048 and (media_url='' or media_url ~ '^https?://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$')),
 contact_consent boolean not null check(contact_consent),
 status text not null default 'new' check(status in ('new','contacted','proposal_sent','booked','closed')),
 staff_notes text not null default '' check(length(staff_notes)<=4000),reviewed_by uuid references auth.users(id) on delete set null,
 revision integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index advertiser_enquiries_status_date_idx on private.advertiser_enquiries(status,created_at desc,id desc);
create index advertiser_enquiries_reviewer_idx on private.advertiser_enquiries(reviewed_by);
alter table private.advertising_ingest_config enable row level security;alter table private.advertising_limits enable row level security;alter table private.ad_events enable row level security;alter table private.advertiser_enquiries enable row level security;
revoke all on private.advertising_ingest_config,private.advertising_limits,private.ad_events,private.advertiser_enquiries from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.advertising_ingest_config to service_role;
grant select,insert,update,delete on private.advertising_limits,private.ad_events,private.advertiser_enquiries to service_role;
insert into private.advertising_ingest_config(id) values(true);
create function public.advertising_ingest_config() returns text language sql stable security invoker set search_path='' as $$select salt from private.advertising_ingest_config where id$$;
create function public.submit_advertiser_enquiry(p_form jsonb,p_key uuid,p_client_hash text,p_email_hash text,p_payload_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved private.advertiser_enquiries;field text;hits integer;
begin
 if p_key is null or p_client_hash is null or p_email_hash is null or p_payload_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$' or p_payload_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid identity' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,3));
 select * into saved from private.advertiser_enquiries where submission_key=p_key;
 if found then if saved.payload_hash<>p_payload_hash then raise exception 'Submission key already used' using errcode='P0409';end if;return jsonb_build_object('reference',saved.reference,'received_at',saved.created_at);end if;
 if p_form is null or jsonb_typeof(p_form)<>'object' or octet_length(p_form::text)>20000 then raise exception 'Invalid enquiry' using errcode='22023';end if;
 foreach field in array array['company','contact_name','email','phone','website','goal','placement_interest','budget','start_date','end_date','brief','media_url'] loop if jsonb_typeof(p_form->field) is distinct from 'string' then raise exception 'Invalid enquiry field' using errcode='22023';end if;end loop;
 if p_form->'contact_consent' is distinct from 'true'::jsonb then raise exception 'Contact consent required' using errcode='22023';end if;
 begin
  if p_form->>'start_date'<>'' and ((p_form->>'start_date') !~ '^\d{4}-\d{2}-\d{2}$' or (p_form->>'start_date')::date<(now() at time zone 'Asia/Kolkata')::date) then raise exception 'Invalid start date' using errcode='22023';end if;
  if p_form->>'end_date'<>'' and ((p_form->>'end_date') !~ '^\d{4}-\d{2}-\d{2}$' or (p_form->>'end_date')::date<(now() at time zone 'Asia/Kolkata')::date or (p_form->>'start_date'<>'' and (p_form->>'end_date')::date<(p_form->>'start_date')::date)) then raise exception 'Invalid end date' using errcode='22023';end if;
 exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Invalid dates' using errcode='22023';end;
 insert into private.advertising_limits values(p_client_hash,'enquiry_ip',date_trunc('hour',clock_timestamp()),1) on conflict(identity_hash,kind,bucket) do update set hits=private.advertising_limits.hits+1 where private.advertising_limits.hits<10 returning private.advertising_limits.hits into hits;
 if hits is null then raise exception 'Submission rate exceeded' using errcode='P0429';end if;hits:=null;
 insert into private.advertising_limits values(p_email_hash,'enquiry_email',date_trunc('day',clock_timestamp() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata',1) on conflict(identity_hash,kind,bucket) do update set hits=private.advertising_limits.hits+1 where private.advertising_limits.hits<20 returning private.advertising_limits.hits into hits;
 if hits is null then raise exception 'Submission rate exceeded' using errcode='P0429';end if;
 begin
  insert into private.advertiser_enquiries(submission_key,payload_hash,company,contact_name,email,phone,website,goal,placement_interest,budget,start_date,end_date,brief,media_url,contact_consent)
  values(p_key,p_payload_hash,btrim(p_form->>'company'),btrim(p_form->>'contact_name'),lower(btrim(p_form->>'email')),btrim(p_form->>'phone'),p_form->>'website',p_form->>'goal',p_form->>'placement_interest',p_form->>'budget',p_form->>'start_date',p_form->>'end_date',btrim(p_form->>'brief'),p_form->>'media_url',true) returning * into saved;
 exception when check_violation or not_null_violation then raise exception 'Invalid enquiry details' using errcode='22023';end;
 return jsonb_build_object('reference',saved.reference,'received_at',saved.created_at);
end $$;
create function public.record_ad_event(p_campaign_id uuid,p_placement text,p_kind text,p_display_hash text,p_client_hash text,p_article_id uuid,p_category text,p_device text) returns boolean language plpgsql security invoker set search_path='' as $$
declare campaign public.site_ad_campaigns;settings jsonb;category text:='';hits integer;
begin
 if p_kind is null or p_kind not in ('impression','viewable','click') or p_device is null or p_device not in ('desktop','mobile') or p_display_hash is null or p_client_hash is null or p_display_hash !~ '^[a-f0-9]{64}$' or p_client_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid event' using errcode='22023';end if;
 if p_placement in ('article_header','article_sidebar','article_inline') then select coalesce((select c.slug from public.content_categories c where c.slug=a.category or a.category=any(c.aliases) limit 1),trim(both '-' from regexp_replace(lower(coalesce(a.category,'')),'[^a-z0-9]+','-','g'))) into category from public.news_articles a where id=p_article_id and status='published';if not found then return false;end if;
 elsif p_placement in ('home_header','home_feed') then if p_article_id is not null then return false;end if;category:=coalesce(p_category,'');
 else raise exception 'Invalid placement' using errcode='22023';end if;
 select * into campaign from public.site_ad_campaigns where id=p_campaign_id and enabled and starts_at<=now() and ends_at>now();
 if not found or not p_placement=any(campaign.placements) or not p_device=any(campaign.devices) or (cardinality(campaign.categories)>0 and not category=any(campaign.categories)) then return false;end if;
 select p into settings from public.site_ad_settings s cross join lateral jsonb_array_elements(s.config->'placements') p where s.id='website' and p->>'id'=p_placement;
 if settings is null or not (settings->>'enabled')::boolean or not (settings->>p_device)::boolean then return false;end if;
 insert into private.advertising_limits values(p_client_hash,'event_ip',date_trunc('minute',clock_timestamp()),1) on conflict(identity_hash,kind,bucket) do update set hits=private.advertising_limits.hits+1 where private.advertising_limits.hits<120 returning private.advertising_limits.hits into hits;
 if hits is null then return false;end if;
 -- A visible/clicked banner necessarily had a display, even if its load event was lost.
 insert into private.ad_events(campaign_id,placement,kind,display_hash) values(p_campaign_id,p_placement,'impression',p_display_hash) on conflict do nothing;
 if p_kind<>'impression' then insert into private.ad_events(campaign_id,placement,kind,display_hash) values(p_campaign_id,p_placement,p_kind,p_display_hash) on conflict do nothing;end if;
 return true;
end $$;
revoke all on function public.advertising_ingest_config(),public.submit_advertiser_enquiry(jsonb,uuid,text,text,text),public.record_ad_event(uuid,text,text,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.advertising_ingest_config(),public.submit_advertiser_enquiry(jsonb,uuid,text,text,text),public.record_ad_event(uuid,text,text,text,text,uuid,text,text) to service_role;

create function private.studio_advertiser_enquiries(p_action text,p_id uuid default null,p_revision integer default null,p_status text default 'all',p_notes text default '',p_search text default '',p_page integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.studio_require_admin();saved private.advertiser_enquiries;result jsonb;
begin
 if p_action='list' then
  if p_status is null or p_status not in ('all','new','contacted','proposal_sent','booked','closed') or p_search is null or length(p_search)>100 or p_page is null or p_page not between 1 and 100000 then raise exception 'Invalid enquiry filter' using errcode='22023';end if;
  with filtered as(select id,reference,company,contact_name,email,goal,budget,status,created_at,revision from private.advertiser_enquiries where (p_status='all' or status=p_status) and (p_search='' or strpos(lower(company||' '||email||' '||reference),lower(p_search))>0)),page as(select * from filtered order by created_at desc,id desc limit 25 offset (p_page-1)*25)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb),'count',(select count(*) from filtered)) into result;return result;
 elsif p_action='get' then return(select to_jsonb(e)-'submission_key'-'payload_hash' from private.advertiser_enquiries e where id=p_id);
 elsif p_action='review' then
  select * into saved from private.advertiser_enquiries where id=p_id for update;
  if not found then raise exception 'Enquiry not found' using errcode='22023';end if;
  if p_revision is distinct from saved.revision then raise exception 'Enquiry changed in another session' using errcode='40001';end if;
  if p_status is null or p_status not in ('new','contacted','proposal_sent','booked','closed') or p_notes is null or length(p_notes)>4000 then raise exception 'Invalid review' using errcode='22023';end if;
  update private.advertiser_enquiries set status=p_status,staff_notes=btrim(p_notes),reviewed_by=actor,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into saved;return to_jsonb(saved)-'submission_key'-'payload_hash';
 end if;
 raise exception 'Invalid enquiry operation' using errcode='22023';
end $$;
create function public.studio_advertiser_enquiries(p_action text,p_id uuid default null,p_revision integer default null,p_status text default 'all',p_notes text default '',p_search text default '',p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$select private.studio_advertiser_enquiries(p_action,p_id,p_revision,p_status,p_notes,p_search,p_page)$$;
create function private.studio_ad_report(p_start date,p_end date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.studio_require_admin();
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>366 then raise exception 'Choose a date range of 367 days or less' using errcode='22023';end if;
 with events as(select * from private.ad_events where event_day between p_start and p_end),
 campaigns as(select c.id as campaign_id,c.name,count(e.*) filter(where kind='impression') as impressions,count(e.*) filter(where kind='viewable') as viewable,count(e.*) filter(where kind='click') as clicks from public.site_ad_campaigns c left join events e on e.campaign_id=c.id group by c.id,c.name),
 placements as(select placement,count(*) filter(where kind='impression') as impressions,count(*) filter(where kind='viewable') as viewable,count(*) filter(where kind='click') as clicks from events group by placement)
 select jsonb_build_object('totals',jsonb_build_object('impressions',(select count(*) from events where kind='impression'),'viewable',(select count(*) from events where kind='viewable'),'clicks',(select count(*) from events where kind='click')),'campaigns',coalesce((select jsonb_agg(to_jsonb(campaigns) order by impressions desc) from campaigns),'[]'::jsonb),'placements',coalesce((select jsonb_agg(to_jsonb(placements) order by impressions desc) from placements),'[]'::jsonb)) into result;return result;
end $$;
create function public.studio_ad_report(p_start date,p_end date) returns jsonb language sql security invoker set search_path='' as $$select private.studio_ad_report(p_start,p_end)$$;
revoke all on function private.studio_advertiser_enquiries(text,uuid,integer,text,text,text,integer),public.studio_advertiser_enquiries(text,uuid,integer,text,text,text,integer),private.studio_ad_report(date,date),public.studio_ad_report(date,date) from public,anon;
grant execute on function private.studio_advertiser_enquiries(text,uuid,integer,text,text,text,integer),public.studio_advertiser_enquiries(text,uuid,integer,text,text,text,integer),private.studio_ad_report(date,date),public.studio_ad_report(date,date) to authenticated;
