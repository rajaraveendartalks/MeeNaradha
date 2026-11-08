-- Additive editorial tools; existing stories keep their content, URLs and attribution.
create table public.site_typography (
 id text primary key check(id='website'),
 config jsonb not null default '{"headline":"system","body":"system","bodySize":18,"lineHeight":1.95}',
 revision integer not null default 0, updated_at timestamptz not null default now(),
 check(jsonb_typeof(config)='object' and octet_length(config::text)<2048),
 check(config->>'headline' in ('system','noto-sans-telugu','noto-serif-telugu','mandali','ramabhadra','ntr','hind-guntur')),
 check(config->>'body' in ('system','noto-sans-telugu','noto-serif-telugu','mandali','ramabhadra','ntr','hind-guntur')),
 check((config->>'bodySize')::numeric between 16 and 24 and (config->>'lineHeight')::numeric between 1.6 and 2.4)
);
alter table public.site_typography enable row level security;
revoke all on public.site_typography from anon,authenticated;
grant select on public.site_typography to anon,authenticated;
grant update(config) on public.site_typography to authenticated;
create policy typography_read on public.site_typography for select to anon,authenticated using(true);
create policy typography_admin_update on public.site_typography for update to authenticated using((select private.current_app_role())='admin') with check((select private.current_app_role())='admin');
create function private.bump_editorial_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;end $$;
revoke all on function private.bump_editorial_revision() from public,anon,authenticated;
create trigger typography_revision before update on public.site_typography for each row execute function private.bump_editorial_revision();
insert into public.site_typography(id) values('website');

create table public.editorial_calendar (
 id uuid primary key default gen_random_uuid(), title text not null check(length(btrim(title)) between 1 and 180),
 event_date date not null, kind text not null check(kind in ('birthday','important_day','milestone')),
 annual boolean not null default false, notes text not null default '' check(length(notes)<=2000),
 source_url text not null default '' check(length(source_url)<=2048 and (source_url='' or source_url ~ '^https?://')),
 archived boolean not null default false, revision integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.editorial_calendar enable row level security;
revoke all on public.editorial_calendar from anon,authenticated;
grant select,insert,update on public.editorial_calendar to authenticated;
create policy calendar_staff_select on public.editorial_calendar for select to authenticated using((select private.current_app_role()) in ('admin','editor'));
create policy calendar_staff_insert on public.editorial_calendar for insert to authenticated with check((select private.current_app_role()) in ('admin','editor'));
create policy calendar_staff_update on public.editorial_calendar for update to authenticated using((select private.current_app_role()) in ('admin','editor')) with check((select private.current_app_role()) in ('admin','editor'));
create trigger calendar_revision before update on public.editorial_calendar for each row execute function private.bump_editorial_revision();
create index editorial_calendar_date_idx on public.editorial_calendar(event_date) where not archived;
insert into public.editorial_calendar(title,event_date,kind,annual,source_url,notes) values
 ('Republic Day','1950-01-26','important_day',true,'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2218369&lang=1&reg=6','India · national day'),
 ('International Mother Language Day','2000-02-21','important_day',true,'https://www.un.org/en/observances/mother-language-day','Language, culture and Telugu stories'),
 ('International Women’s Day','1975-03-08','important_day',true,'https://www.un.org/en/observances/womens-day','People and achievement stories'),
 ('International Day of Yoga','2015-06-21','important_day',true,'https://www.un.org/en/observances/yoga-day','Wellness, personalities and community'),
 ('Independence Day','1947-08-15','important_day',true,'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2218369&lang=1&reg=6','India · national day'),
 ('International Day of Peace','1982-09-21','important_day',true,'https://www.un.org/en/observances/international-day-peace','Culture and community stories'),
 ('World Television Day','1996-11-21','important_day',true,'https://www.un.org/en/observances/world-television-day','Television, creators and broadcasting'),
 ('Human Rights Day','1948-12-10','important_day',true,'https://www.un.org/en/observances/human-rights-day','Public interest and community stories');
insert into public.content_categories(slug,name_en,name_te,sort_order) values
 ('sports','Sports','క్రీడలు',30),('music','Music','సంగీతం',31),('influencers','Influencers','ఇన్‌ఫ్లుయెన్సర్లు',32)
on conflict(slug) do nothing;

alter table public.news_articles add column author_id uuid references auth.users(id) on delete set null;
create index news_articles_author_idx on public.news_articles(author_id);
-- New CMS posts get their signed-in writer. Historical posts remain honestly unassigned.
create function private.article_writer_guard() returns trigger language plpgsql set search_path='' as $$
declare actor uuid:=(select auth.uid()); actor_role public.app_role;
begin
 actor_role:=private.current_app_role();
 if tg_op='INSERT' and actor is not null then
  if new.author_id is null then new.author_id:=actor;end if;
  if new.author_id<>actor and actor_role<>'admin' then raise exception 'Only an administrator can assign another writer' using errcode='42501';end if;
 elsif tg_op='UPDATE' and actor is not null and new.author_id is distinct from old.author_id and actor_role<>'admin' then
  raise exception 'Only an administrator can change writer attribution' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.article_writer_guard() from public,anon,authenticated;
create trigger article_writer_guard before insert or update on public.news_articles for each row execute function private.article_writer_guard();
create function private.studio_writers() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.studio_require_admin();
 return coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',left(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),u.email,'Writer'),100)) order by u.email) from auth.users u where exists(select 1 from public.user_roles r where r.user_id=u.id and r.role in ('admin','editor'))),'[]'::jsonb);
end $$;
create function public.studio_writers() returns jsonb language sql security invoker set search_path='' as $$select private.studio_writers()$$;
revoke all on function private.studio_writers(),public.studio_writers() from public,anon;
grant execute on function private.studio_writers(),public.studio_writers() to authenticated;

-- Telemetry is private. Only the ingest Edge Function can record bounded events.
create table private.article_analytics_config(id boolean primary key default true check(id),salt text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),started_at timestamptz not null default now());
create table private.article_events(
 article_id uuid not null references public.news_articles(id) on delete cascade,
 event_day date not null default (now() at time zone 'Asia/Kolkata')::date,
 kind text not null check(kind in ('view','share_click')),platform text not null,
 visitor_hash text not null check(visitor_hash ~ '^[a-f0-9]{64}$'),created_at timestamptz not null default now(),
 primary key(event_day,article_id,kind,platform,visitor_hash),
 check((kind='view' and platform='none') or (kind='share_click' and platform in ('facebook','x','instagram','whatsapp','reddit','telegram','linkedin','pinterest','email','copy','more')))
);
create index article_events_article_day_idx on private.article_events(article_id,event_day);
create table private.article_event_limits(client_hash text not null,bucket timestamptz not null,hits integer not null,primary key(client_hash,bucket));
alter table private.article_analytics_config enable row level security;
alter table private.article_events enable row level security;
alter table private.article_event_limits enable row level security;
revoke all on private.article_analytics_config,private.article_events,private.article_event_limits from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.article_analytics_config to service_role;
grant select,insert,update,delete on private.article_events,private.article_event_limits to service_role;
insert into private.article_analytics_config(id) values(true);
create function public.article_analytics_ingest_config() returns text language sql stable security invoker set search_path='' as $$select salt from private.article_analytics_config where id$$;
create function public.record_article_event(p_article_id uuid,p_kind text,p_platform text,p_visitor_hash text,p_client_hash text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare current_hits integer;
begin
 if p_visitor_hash is null or p_client_hash is null or p_visitor_hash !~ '^[a-f0-9]{64}$' or p_client_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid event identity' using errcode='22023';end if;
 if p_kind is null or p_platform is null or not ((p_kind='view' and p_platform='none') or (p_kind='share_click' and p_platform in ('facebook','x','instagram','whatsapp','reddit','telegram','linkedin','pinterest','email','copy','more'))) then raise exception 'Invalid event type' using errcode='22023';end if;
 if not exists(select 1 from public.news_articles where id=p_article_id and status='published') then return false;end if;
 insert into private.article_event_limits(client_hash,bucket,hits) values(p_client_hash,date_trunc('minute',clock_timestamp()),1)
 on conflict(client_hash,bucket) do update set hits=private.article_event_limits.hits+1 returning hits into current_hits;
 if current_hits>60 then return false;end if;
 insert into private.article_events(article_id,kind,platform,visitor_hash) values(p_article_id,p_kind,p_platform,p_visitor_hash) on conflict do nothing;
 if random()<0.01 then
  delete from private.article_event_limits where bucket<now()-interval '2 days';
  delete from private.article_events where event_day<(now() at time zone 'Asia/Kolkata')::date-400;
 end if;
 return true;
end $$;
revoke all on function public.article_analytics_ingest_config(),public.record_article_event(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.article_analytics_ingest_config(),public.record_article_event(uuid,text,text,text,text) to service_role;

create function private.studio_article_report(p_start date,p_end date,p_author uuid default null,p_category text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());app_role public.app_role;result jsonb;
begin
 app_role:=private.current_app_role();
 if actor is null or app_role not in ('admin','editor') then raise exception 'Editor access is required' using errcode='42501';end if;
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>366 then raise exception 'Choose a date range of 367 days or less' using errcode='22023';end if;
 if app_role<>'admin' then p_author:=actor;end if;
 with article_scope as (
  select a.id,a.slug,coalesce(a.headline_te,a.headline_en) as title,a.category,a.author_id,a.status,a.published_at,
   left(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),u.email,case when a.author_id is null then 'Unassigned (older content)' else 'Former writer' end),100) as author_name
  from public.news_articles a left join auth.users u on u.id=a.author_id
  where (p_author is null or a.author_id=p_author) and (nullif(p_category,'') is null or a.category=p_category)
 ), event_scope as (
  select e.* from private.article_events e join article_scope a on a.id=e.article_id where e.event_day between p_start and p_end
 ), article_totals as (
  select a.*,count(e.*) filter(where e.kind='view') as views,count(e.*) filter(where e.kind='share_click') as share_clicks,
   (a.status='published' and (a.published_at at time zone 'Asia/Kolkata')::date between p_start and p_end) as published_in_range
  from article_scope a left join event_scope e on e.article_id=a.id group by a.id,a.slug,a.title,a.category,a.author_id,a.status,a.published_at,a.author_name
 ), daily as (select event_day as day,count(*) filter(where kind='view') as views,count(*) filter(where kind='share_click') as share_clicks from event_scope group by event_day),
 writers as (select author_id,author_name,count(*) filter(where published_in_range) as published_posts,sum(views) as views,sum(share_clicks) as share_clicks from article_totals group by author_id,author_name),
 platforms as (select platform,count(*) as clicks from event_scope where kind='share_click' group by platform),
 top_articles as (select * from article_totals where published_in_range or views>0 or share_clicks>0 order by views desc,share_clicks desc,published_at desc nulls last limit 200)
 select jsonb_build_object(
  'started_at',(select started_at from private.article_analytics_config where id),
  'totals',jsonb_build_object('views',(select count(*) from event_scope where kind='view'),'share_clicks',(select count(*) from event_scope where kind='share_click'),'published_posts',(select count(*) from article_totals where published_in_range)),
  'daily',coalesce((select jsonb_agg(to_jsonb(daily) order by day) from daily),'[]'::jsonb),
  'articles',coalesce((select jsonb_agg(to_jsonb(top_articles) order by views desc,share_clicks desc) from top_articles),'[]'::jsonb),
  'writers',coalesce((select jsonb_agg(to_jsonb(writers) order by views desc,share_clicks desc) from writers),'[]'::jsonb),
  'platforms',coalesce((select jsonb_agg(to_jsonb(platforms) order by clicks desc) from platforms),'[]'::jsonb)
 ) into result;
 return result;
end $$;
create function public.studio_article_report(p_start date,p_end date,p_author uuid default null,p_category text default null) returns jsonb
language sql security invoker set search_path='' as $$select private.studio_article_report(p_start,p_end,p_author,p_category)$$;
revoke all on function private.studio_article_report(date,date,uuid,text),public.studio_article_report(date,date,uuid,text) from public,anon;
grant execute on function private.studio_article_report(date,date,uuid,text),public.studio_article_report(date,date,uuid,text) to authenticated;
