-- Anonymous reactions are functional reader choices. Individual identities stay private.
create table public.site_reaction_settings(
 id text primary key check(id='website'),enabled boolean not null default true,kiss_enabled boolean not null default true,
 kiss_categories text[] not null default array['movies','celebrities','ott'],revision integer not null default 0,updated_at timestamptz not null default now(),
 check(cardinality(kiss_categories)<=30 and array_position(kiss_categories,null) is null)
);
alter table public.site_reaction_settings enable row level security;
revoke all on public.site_reaction_settings from public,anon,authenticated;
grant select on public.site_reaction_settings to anon,authenticated;
grant update on public.site_reaction_settings to authenticated;
grant select on public.site_reaction_settings to service_role;
create policy reactions_settings_read on public.site_reaction_settings for select to anon,authenticated using(true);
create policy reactions_settings_admin_update on public.site_reaction_settings for update to authenticated using((select private.current_app_role())='admin') with check((select private.current_app_role())='admin');
create function private.guard_reaction_settings() returns trigger language plpgsql set search_path='' as $$
declare category text;
begin
 if new.id<>old.id or cardinality(new.kiss_categories)<>(select count(distinct value) from unnest(new.kiss_categories) value) then raise exception 'Invalid reaction settings' using errcode='22023';end if;
 foreach category in array new.kiss_categories loop
  if not exists(select 1 from public.content_categories where slug=category) then raise exception 'Choose valid content categories' using errcode='22023';end if;
 end loop;
 new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function private.guard_reaction_settings() from public,anon,authenticated;
create trigger guard_reaction_settings before update on public.site_reaction_settings for each row execute function private.guard_reaction_settings();
insert into public.site_reaction_settings(id) values('website');

create table private.article_reaction_config(id boolean primary key default true check(id),salt text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''));
create table private.article_reaction_totals(
 article_id uuid primary key references public.news_articles(id) on delete cascade,
 like_count bigint not null default 0 check(like_count>=0),heart_count bigint not null default 0 check(heart_count>=0),
 angry_count bigint not null default 0 check(angry_count>=0),lol_count bigint not null default 0 check(lol_count>=0),
 kiss_count bigint not null default 0 check(kiss_count>=0),egg_count bigint not null default 0 check(egg_count>=0),revision bigint not null default 0,updated_at timestamptz not null default now()
);
create table private.article_reaction_votes(
 article_id uuid not null references public.news_articles(id) on delete cascade,browser_hash text not null check(browser_hash ~ '^[a-f0-9]{64}$'),
 reaction text check(reaction in ('like','heart','angry','lol','kiss','egg')),version bigint not null check(version>0),last_operation_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),primary key(article_id,browser_hash)
);
create table private.article_reaction_events(
 id bigint generated always as identity primary key,article_id uuid not null references public.news_articles(id) on delete cascade,
 browser_hash text not null check(browser_hash ~ '^[a-f0-9]{64}$'),previous_reaction text check(previous_reaction in ('like','heart','angry','lol','kiss','egg')),
 reaction text check(reaction in ('like','heart','angry','lol','kiss','egg')),occurred_at timestamptz not null default clock_timestamp(),check(previous_reaction is distinct from reaction)
);
create index article_reaction_events_period_idx on private.article_reaction_events(occurred_at,article_id,browser_hash,id desc);
create index article_reaction_events_article_idx on private.article_reaction_events(article_id,browser_hash,id desc);
create table private.article_reaction_limits(
 identity_hash text primary key check(identity_hash ~ '^[a-f0-9]{64}$'),minute_start timestamptz not null,minute_hits integer not null,
 day_start date not null,day_hits integer not null
);
alter table private.article_reaction_config enable row level security;
alter table private.article_reaction_totals enable row level security;
alter table private.article_reaction_votes enable row level security;
alter table private.article_reaction_events enable row level security;
alter table private.article_reaction_limits enable row level security;
revoke all on private.article_reaction_config,private.article_reaction_totals,private.article_reaction_votes,private.article_reaction_events,private.article_reaction_limits from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.article_reaction_config to service_role;
grant select,insert,update on private.article_reaction_totals,private.article_reaction_votes,private.article_reaction_limits to service_role;
grant select,insert on private.article_reaction_events to service_role;
grant usage,select on sequence private.article_reaction_events_id_seq to service_role;
insert into private.article_reaction_config(id) values(true);
create function public.article_reaction_ingest_config() returns text language sql security invoker set search_path='' as $$select salt from private.article_reaction_config where id$$;

create function private.reaction_category(p_article_id uuid) returns text language sql stable security invoker set search_path='' as $$
 select coalesce((select c.slug from public.content_categories c where lower(c.slug)=lower(a.category) or lower(c.name_en)=lower(a.category) or lower(c.name_te)=lower(a.category) or exists(select 1 from unnest(c.aliases) alias where lower(alias)=lower(a.category)) order by c.slug limit 1),nullif(regexp_replace(lower(btrim(a.category)),'[_ ]+','-','g'),''),'other') from public.news_articles a where a.id=p_article_id
$$;
create function private.consume_reaction_limit(p_hash text,p_minute integer,p_day integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare row private.article_reaction_limits;minute_value timestamptz:=date_trunc('minute',clock_timestamp());day_value date:=(clock_timestamp() at time zone 'Asia/Kolkata')::date;
begin
 insert into private.article_reaction_limits(identity_hash,minute_start,minute_hits,day_start,day_hits) values(p_hash,minute_value,1,day_value,1)
 on conflict(identity_hash) do update set minute_start=minute_value,minute_hits=case when private.article_reaction_limits.minute_start=minute_value then private.article_reaction_limits.minute_hits+1 else 1 end,day_start=day_value,day_hits=case when private.article_reaction_limits.day_start=day_value then private.article_reaction_limits.day_hits+1 else 1 end returning * into row;
 return row.minute_hits<=p_minute and row.day_hits<=p_day;
end $$;
create function public.article_reaction_state(p_article_id uuid,p_browser_hash text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare settings public.site_reaction_settings;totals private.article_reaction_totals;vote private.article_reaction_votes;allowed text[]:=array['like','heart','angry','lol','egg'];counts jsonb;category text;
begin
 if p_browser_hash is not null and p_browser_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid browser identity' using errcode='22023';end if;
 if not exists(select 1 from public.news_articles where id=p_article_id and status='published') then raise exception 'Article unavailable' using errcode='P0404';end if;
 select * into settings from public.site_reaction_settings where id='website';category:=private.reaction_category(p_article_id);
 if settings.kiss_enabled and category=any(settings.kiss_categories) then allowed:=array['like','heart','angry','lol','kiss','egg'];end if;
 if not settings.enabled then allowed:='{}';end if;
 select * into totals from private.article_reaction_totals where article_id=p_article_id;
 if p_browser_hash is not null then select * into vote from private.article_reaction_votes where article_id=p_article_id and browser_hash=p_browser_hash;end if;
 counts:=jsonb_build_object('like',case when settings.enabled then coalesce(totals.like_count,0) else 0 end,'heart',case when settings.enabled then coalesce(totals.heart_count,0) else 0 end,'angry',case when settings.enabled then coalesce(totals.angry_count,0) else 0 end,'lol',case when settings.enabled then coalesce(totals.lol_count,0) else 0 end,'kiss',case when 'kiss'=any(allowed) then coalesce(totals.kiss_count,0) else 0 end,'egg',case when settings.enabled then coalesce(totals.egg_count,0) else 0 end);
 return jsonb_build_object('enabled',settings.enabled,'allowed',to_jsonb(allowed),'counts',counts,'total',(select coalesce(sum(value::bigint),0) from jsonb_each_text(counts)),'selected',vote.reaction,'version',coalesce(vote.version,0),'revision',coalesce(totals.revision,0));
end $$;
create function public.set_article_reaction(p_article_id uuid,p_browser_hash text,p_client_hash text,p_reaction text,p_operation_id uuid,p_version bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous private.article_reaction_votes;settings public.site_reaction_settings;old_reaction text;category text;
begin
 if p_browser_hash is null or p_client_hash is null or p_browser_hash !~ '^[a-f0-9]{64}$' or p_client_hash !~ '^[a-f0-9]{64}$' or p_operation_id is null or p_version is null or p_version<0 or p_version>2147483647 or p_reaction is not null and p_reaction not in ('like','heart','angry','lol','kiss','egg') then raise exception 'Invalid reaction' using errcode='22023';end if;
 if not exists(select 1 from public.news_articles where id=p_article_id and status='published') then raise exception 'Article unavailable' using errcode='P0404';end if;
 select * into settings from public.site_reaction_settings where id='website';category:=private.reaction_category(p_article_id);
 if p_reaction is not null and (not settings.enabled or p_reaction='kiss' and (not settings.kiss_enabled or not category=any(settings.kiss_categories))) then raise exception 'Reaction unavailable' using errcode='22023';end if;
 if not private.consume_reaction_limit(p_client_hash,120,2000) or not private.consume_reaction_limit(p_browser_hash,30,200) then raise exception 'Pause before changing reactions again' using errcode='P0429';end if;
 insert into private.article_reaction_totals(article_id) values(p_article_id) on conflict do nothing;
 perform 1 from private.article_reaction_totals where article_id=p_article_id for update;
 select * into previous from private.article_reaction_votes where article_id=p_article_id and browser_hash=p_browser_hash;
 if previous.last_operation_id=p_operation_id then return public.article_reaction_state(p_article_id,p_browser_hash);end if;
 if coalesce(previous.version,0)<>p_version then return jsonb_build_object('conflict',true,'state',public.article_reaction_state(p_article_id,p_browser_hash));end if;
 old_reaction:=previous.reaction;if old_reaction is not distinct from p_reaction then return public.article_reaction_state(p_article_id,p_browser_hash);end if;
 insert into private.article_reaction_votes(article_id,browser_hash,reaction,version,last_operation_id) values(p_article_id,p_browser_hash,p_reaction,coalesce(previous.version,0)+1,p_operation_id)
 on conflict(article_id,browser_hash) do update set reaction=excluded.reaction,version=excluded.version,last_operation_id=excluded.last_operation_id,updated_at=clock_timestamp();
 update private.article_reaction_totals set
  like_count=like_count+(case when p_reaction='like' then 1 else 0 end)-(case when old_reaction='like' then 1 else 0 end),
  heart_count=heart_count+(case when p_reaction='heart' then 1 else 0 end)-(case when old_reaction='heart' then 1 else 0 end),
  angry_count=angry_count+(case when p_reaction='angry' then 1 else 0 end)-(case when old_reaction='angry' then 1 else 0 end),
  lol_count=lol_count+(case when p_reaction='lol' then 1 else 0 end)-(case when old_reaction='lol' then 1 else 0 end),
  kiss_count=kiss_count+(case when p_reaction='kiss' then 1 else 0 end)-(case when old_reaction='kiss' then 1 else 0 end),
  egg_count=egg_count+(case when p_reaction='egg' then 1 else 0 end)-(case when old_reaction='egg' then 1 else 0 end),revision=revision+1,updated_at=clock_timestamp() where article_id=p_article_id;
 insert into private.article_reaction_events(article_id,browser_hash,previous_reaction,reaction) values(p_article_id,p_browser_hash,old_reaction,p_reaction);
 return public.article_reaction_state(p_article_id,p_browser_hash);
end $$;
revoke all on function public.article_reaction_ingest_config(),private.reaction_category(uuid),private.consume_reaction_limit(text,integer,integer),public.article_reaction_state(uuid,text),public.set_article_reaction(uuid,text,text,text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.article_reaction_ingest_config(),private.reaction_category(uuid),private.consume_reaction_limit(text,integer,integer),public.article_reaction_state(uuid,text),public.set_article_reaction(uuid,text,text,text,uuid,bigint) to service_role;

-- Only this private, role-checked function reads individual choices for aggregate reports.
create function private.studio_reaction_report(p_start date,p_end date,p_category text default null,p_author uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare staff_role text;actor uuid:=auth.uid();result jsonb;
begin
 staff_role:=private.current_app_role()::text;
 if actor is null or staff_role is null or staff_role not in ('admin','editor') then raise exception 'Staff access required' using errcode='42501';end if;
 if staff_role='editor' and p_author is not null and p_author<>actor then raise exception 'Your own articles only' using errcode='42501';end if;
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>92 then raise exception 'Choose a date range of up to 93 days' using errcode='22023';end if;
 with article_scope as materialized (
  select a.id,a.slug,coalesce(nullif(a.headline_te,''),a.headline_en,'Untitled') title,a.author_id,private.reaction_category(a.id) category
  from public.news_articles a where (staff_role='admin' or a.author_id=actor) and (p_author is null or a.author_id=p_author) and (p_category is null or private.reaction_category(a.id)=p_category)
 ), event_scope as materialized (
  select e.* from private.article_reaction_events e join article_scope a on a.id=e.article_id where e.occurred_at>=p_start::timestamp at time zone 'Asia/Kolkata' and e.occurred_at<(p_end+1)::timestamp at time zone 'Asia/Kolkata'
 ), latest as materialized (
  select distinct on(article_id,browser_hash) article_id,browser_hash,reaction from event_scope order by article_id,browser_hash,id desc
 ), choices as (
  select article_id,count(*) filter(where reaction is not null) total,
   count(*) filter(where reaction='like') likes,count(*) filter(where reaction='heart') hearts,count(*) filter(where reaction='angry') angry,count(*) filter(where reaction='lol') lol,count(*) filter(where reaction='kiss') kiss,count(*) filter(where reaction='egg') egg
  from latest group by article_id
 ), views as (select e.article_id,count(*) count from private.article_events e join article_scope a on a.id=e.article_id where e.kind='view' and e.event_day between p_start and p_end group by e.article_id),
 summary as materialized (
  select a.*,coalesce(c.total,0) total,coalesce(v.count,0) views,
   coalesce(t.like_count+t.heart_count+t.angry_count+t.lol_count+t.kiss_count+t.egg_count,0) live_total,
   coalesce(c.likes,0) likes,coalesce(c.hearts,0) hearts,coalesce(c.angry,0) angry,coalesce(c.lol,0) lol,coalesce(c.kiss,0) kiss,coalesce(c.egg,0) egg,
   jsonb_build_object('like',coalesce(c.likes,0),'heart',coalesce(c.hearts,0),'angry',coalesce(c.angry,0),'lol',coalesce(c.lol,0),'kiss',coalesce(c.kiss,0),'egg',coalesce(c.egg,0)) counts
  from article_scope a left join choices c on c.article_id=a.id left join views v on v.article_id=a.id left join private.article_reaction_totals t on t.article_id=a.id
 ), latest_daily as (
  select distinct on((occurred_at at time zone 'Asia/Kolkata')::date,article_id,browser_hash) (occurred_at at time zone 'Asia/Kolkata')::date as activity_day,article_id,browser_hash,reaction from event_scope order by (occurred_at at time zone 'Asia/Kolkata')::date,article_id,browser_hash,id desc
 ), daily_counts as (select activity_day,count(*) filter(where reaction is not null) total from latest_daily group by activity_day)
 select jsonb_build_object(
  'totals',(select jsonb_build_object('total',coalesce(sum(total),0),'views',coalesce(sum(views),0),'live_total',coalesce(sum(live_total),0),'counts',jsonb_build_object('like',coalesce(sum(likes),0),'heart',coalesce(sum(hearts),0),'angry',coalesce(sum(angry),0),'lol',coalesce(sum(lol),0),'kiss',coalesce(sum(kiss),0),'egg',coalesce(sum(egg),0))) from summary),
  'articles',coalesce((select jsonb_agg(to_jsonb(s) order by s.total desc,s.views desc,s.id) from(select id,slug,title,category,author_id,counts,total,views,live_total from summary where total>0 or views>0 or live_total>0 order by total desc,views desc,id limit 200)s),'[]'::jsonb),
  'article_count',(select count(*) from summary where total>0 or views>0 or live_total>0),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.total desc,c.category) from(select category,sum(total) total from summary group by category having sum(total)>0)c),'[]'::jsonb),
  'writers',coalesce((select jsonb_agg(to_jsonb(w) order by w.total desc) from(select author_id,sum(total) total,sum(views) views from summary group by author_id having sum(total)>0 or sum(views)>0)w),'[]'::jsonb),
  'daily',(select jsonb_agg(jsonb_build_object('day',d.activity_day::date,'total',coalesce(daily_counts.total,0)) order by d.activity_day) from generate_series(p_start::timestamp,p_end::timestamp,interval '1 day')as d(activity_day) left join daily_counts on daily_counts.activity_day=d.activity_day::date)
 ) into result;
 return result;
end $$;
create function public.studio_reaction_report(p_start date,p_end date,p_category text default null,p_author uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.studio_reaction_report(p_start,p_end,p_category,p_author)$$;
revoke all on function private.studio_reaction_report(date,date,text,uuid),public.studio_reaction_report(date,date,text,uuid) from public,anon,authenticated;
grant execute on function private.studio_reaction_report(date,date,text,uuid),public.studio_reaction_report(date,date,text,uuid) to authenticated;
