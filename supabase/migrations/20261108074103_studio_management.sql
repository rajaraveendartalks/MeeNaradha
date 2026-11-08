-- Use one deterministic effective role even when a legacy account has several rows.
create or replace function private.current_app_role() returns public.app_role
language sql stable set search_path='' as $$
  select coalesce((select role from public.user_roles where user_id=(select auth.uid())
    order by case role when 'admin' then 1 when 'editor' then 2 when 'reviewer' then 3 else 4 end limit 1),'user'::public.app_role)
$$;

create table public.content_categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=64 and slug not in ('latest','videos','galleries','short-films','all','admin')),
  name_en text not null check (length(btrim(name_en)) between 1 and 80),
  name_te text not null default '' check (length(name_te)<=100),
  description text not null default '' check (length(description)<=500),
  aliases text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  revision integer not null default 0,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.content_categories enable row level security;
revoke all on public.content_categories from anon,authenticated;
grant select on public.content_categories to anon,authenticated;
grant insert,update on public.content_categories to authenticated;
create policy categories_public_read on public.content_categories for select to anon,authenticated using (true);
create policy categories_staff_insert on public.content_categories for insert to authenticated with check (exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','editor')));
create policy categories_staff_update on public.content_categories for update to authenticated using (exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','editor'))) with check (exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','editor')));
create function private.studio_category_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.slug<>old.slug then raise exception 'Category slugs cannot be changed; existing article links use them' using errcode='22023';end if;
 new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function private.studio_category_revision() from public,anon,authenticated;
create trigger studio_category_revision before update on public.content_categories for each row execute function private.studio_category_revision();
insert into public.content_categories(slug,name_en,name_te,sort_order) values
 ('movies','Movies','సినిమాలు',0),('ott','OTT','OTT',1),('celebrities','Celebrities','సెలబ్రిటీలు',2),('box-office','Box Office','బాక్సాఫీస్',3),('technology','Technology & VFX','టెక్నాలజీ',4),('politics','Politics','రాజకీయాలు',5),('events','Events','ఈవెంట్స్',6),('interviews','Interviews','ఇంటర్వ్యూలు',7),('industry','Industry','పరిశ్రమ',8),('other','Other','ఇతర వార్తలు',9);
-- Import legacy category labels without rewriting any article row.
insert into public.content_categories(slug,name_en,name_te,sort_order)
select distinct trim(both '-' from regexp_replace(lower(btrim(category)),'[^a-z0-9]+','-','g')),left(initcap(btrim(category)),80),'',20
from public.news_articles where category is not null and btrim(category)<>''
and trim(both '-' from regexp_replace(lower(btrim(category)),'[^a-z0-9]+','-','g')) ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
and length(trim(both '-' from regexp_replace(lower(btrim(category)),'[^a-z0-9]+','-','g')))<=64
and trim(both '-' from regexp_replace(lower(btrim(category)),'[^a-z0-9]+','-','g')) not in ('latest','videos','galleries','short-films','all','admin')
on conflict(slug) do nothing;
update public.content_categories c set aliases=coalesce((select array_agg(distinct category) from public.news_articles n where trim(both '-' from regexp_replace(lower(btrim(n.category)),'[^a-z0-9]+','-','g'))=c.slug and n.category<>c.slug),'{}');

create table public.site_navigation (
 id text primary key check(id in ('draft','published')),
 config jsonb not null check(jsonb_typeof(config)='object' and config @> '{"version":1}'::jsonb and octet_length(config::text)<=65536),
 revision integer not null default 0 check(revision>=0),updated_at timestamptz not null default now()
);
alter table public.site_navigation enable row level security;
revoke all on public.site_navigation from anon,authenticated;
grant select on public.site_navigation to anon,authenticated;
grant update on public.site_navigation to authenticated;
create policy menus_published_read on public.site_navigation for select to anon,authenticated using(id='published');
create policy menus_admin_read on public.site_navigation for select to authenticated using(exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'));
create policy menus_admin_update on public.site_navigation for update to authenticated using(exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin')) with check(exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'));
insert into public.site_navigation(id,config) select id,'{"version":1,"menus":{"main":[{"id":"main-home","label":"హోమ్","kind":"home","category":"","url":"","enabled":true,"newTab":false},{"id":"main-movies","label":"సినిమాలు","kind":"category","category":"movies","url":"","enabled":true,"newTab":false},{"id":"main-ott","label":"OTT","kind":"category","category":"ott","url":"","enabled":true,"newTab":false},{"id":"main-galleries","label":"ఫోటోలు","kind":"galleries","category":"","url":"","enabled":true,"newTab":false},{"id":"main-videos","label":"వీడియోలు","kind":"videos","category":"","url":"","enabled":true,"newTab":false}],"categories":[{"id":"category-home","label":"అన్ని వార్తలు","kind":"home","category":"","url":"","enabled":true,"newTab":false},{"id":"category-movies","label":"సినిమాలు","kind":"category","category":"movies","url":"","enabled":true,"newTab":false},{"id":"category-ott","label":"OTT","kind":"category","category":"ott","url":"","enabled":true,"newTab":false},{"id":"category-celebrities","label":"సెలబ్రిటీలు","kind":"category","category":"celebrities","url":"","enabled":true,"newTab":false},{"id":"category-box-office","label":"బాక్సాఫీస్","kind":"category","category":"box-office","url":"","enabled":true,"newTab":false},{"id":"category-technology","label":"టెక్నాలజీ","kind":"category","category":"technology","url":"","enabled":true,"newTab":false},{"id":"category-politics","label":"రాజకీయాలు","kind":"category","category":"politics","url":"","enabled":true,"newTab":false},{"id":"category-short-films","label":"షార్ట్ ఫిల్మ్స్","kind":"custom","category":"","url":"/videos?category=short_film","enabled":true,"newTab":false},{"id":"category-galleries","label":"ఫోటోలు","kind":"galleries","category":"","url":"","enabled":true,"newTab":false}],"footer":[]}}'::jsonb from (values('draft'),('published')) versions(id);
create function public.save_site_navigation(p_config jsonb,p_draft_revision integer,p_published_revision integer,p_publish boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.site_navigation%rowtype;p public.site_navigation%rowtype;
begin
 if not exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin') then raise exception 'Administrator access is required' using errcode='42501';end if;
 if p_config is null or p_publish is null then raise exception 'Invalid menu settings' using errcode='22023';end if;
 select * into d from public.site_navigation where id='draft' for update;
 select * into p from public.site_navigation where id='published' for update;
 if d.id is null or p.id is null then raise exception 'Menu settings unavailable';end if;
 if d.revision is distinct from p_draft_revision or p.revision is distinct from p_published_revision then raise exception 'Menus changed in another session' using errcode='40001';end if;
 update public.site_navigation set config=p_config,revision=revision+1,updated_at=clock_timestamp() where id='draft' returning * into d;
 if p_publish then update public.site_navigation set config=p_config,revision=revision+1,updated_at=clock_timestamp() where id='published' returning * into p;end if;
 return jsonb_build_object('draft',to_jsonb(d),'published',to_jsonb(p));
end $$;
revoke all on function public.save_site_navigation(jsonb,integer,integer,boolean) from public,anon;
grant execute on function public.save_site_navigation(jsonb,integer,integer,boolean) to authenticated;

-- Auth records and role changes stay behind explicitly checked functions in a private schema.
create function private.studio_require_admin() returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());
begin
 if actor is null or not exists(select 1 from public.user_roles where user_id=actor and role='admin') then raise exception 'Administrator access is required' using errcode='42501';end if;
 return actor;
end $$;
create function private.studio_list_users(p_search text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.studio_require_admin();
 with matching as (
  select u.id,u.email,left(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),100) as name,
   coalesce((select role::text from public.user_roles where user_id=u.id order by case role when 'admin' then 1 when 'editor' then 2 when 'reviewer' then 3 else 4 end limit 1),'user') as role,
   u.email_confirmed_at is not null as confirmed,u.created_at,u.last_sign_in_at
  from auth.users u where length(coalesce(p_search,''))<=100 and (coalesce(btrim(p_search),'')='' or position(lower(btrim(p_search)) in lower(coalesce(u.email,'')||' '||coalesce(u.raw_user_meta_data->>'full_name',''))) > 0)
 ), page_rows as (select * from matching order by created_at desc,id limit 25 offset ((greatest(1,least(coalesce(p_page,1),10000))-1)*25))
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows),'[]'::jsonb),'count',(select count(*) from matching)) into result;
 return result;
end $$;
create function private.studio_set_user_role(p_user_id uuid,p_role text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 perform pg_advisory_xact_lock(739801135);
 actor:=private.studio_require_admin();
 if p_role not in ('admin','editor','reviewer','user') or p_role is null then raise exception 'Invalid CMS role' using errcode='22023';end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'This account was not found' using errcode='22023';end if;
 if p_user_id=actor and p_role<>'admin' then raise exception 'You cannot remove your own administrator access' using errcode='22023';end if;
 if p_role<>'admin' and exists(select 1 from public.user_roles where user_id=p_user_id and role='admin') and not exists(select 1 from public.user_roles where role='admin' and user_id<>p_user_id) then raise exception 'Keep at least one administrator' using errcode='22023';end if;
 delete from public.user_roles where user_id=p_user_id;
 insert into public.user_roles(user_id,role) values(p_user_id,p_role::public.app_role);
 return jsonb_build_object('id',p_user_id,'role',p_role);
end $$;
revoke all on function private.studio_require_admin(),private.studio_list_users(text,integer),private.studio_set_user_role(uuid,text) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.studio_require_admin(),private.studio_list_users(text,integer),private.studio_set_user_role(uuid,text) to authenticated;
create function public.studio_list_users(p_search text default '',p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select private.studio_list_users(p_search,p_page) $$;
create function public.studio_set_user_role(p_user_id uuid,p_role text) returns jsonb language sql security invoker set search_path='' as $$ select private.studio_set_user_role(p_user_id,p_role) $$;
revoke all on function public.studio_list_users(text,integer),public.studio_set_user_role(uuid,text) from public,anon;
grant execute on function public.studio_list_users(text,integer),public.studio_set_user_role(uuid,text) to authenticated;
create function public.studio_category_counts() returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(category,total),'{}'::jsonb) from (
  select category,count(*) as total from public.news_articles where category is not null and exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role in ('admin','editor')) group by category
 ) counts
$$;
revoke all on function public.studio_category_counts() from public,anon;
grant execute on function public.studio_category_counts() to authenticated;
