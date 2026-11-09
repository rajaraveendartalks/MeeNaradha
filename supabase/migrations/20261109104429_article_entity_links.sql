-- Additive editorial options; existing article text and profile URLs are preserved.
alter table public.movies add column if not exists article_aliases text[] not null default '{}';
alter table public.people add column if not exists article_aliases text[] not null default '{}';
alter table public.companies add column if not exists article_aliases text[] not null default '{}';
alter table public.news_articles add column if not exists auto_link_entities boolean not null default true;
alter table public.movies add constraint movies_article_aliases_bounds check (cardinality(article_aliases)<=30 and array_position(article_aliases,null) is null and length(array_to_string(article_aliases,','))<=4000);
alter table public.people add constraint people_article_aliases_bounds check (cardinality(article_aliases)<=30 and array_position(article_aliases,null) is null and length(array_to_string(article_aliases,','))<=4000);
alter table public.companies add constraint companies_article_aliases_bounds check (cardinality(article_aliases)<=30 and array_position(article_aliases,null) is null and length(array_to_string(article_aliases,','))<=4000);

-- Published names only, under the caller's existing table grants and row policies.
create or replace function public.article_entity_candidates(p_text text)
returns table(kind text,id uuid,slug text,name_en text,name_te text,article_aliases text[])
language sql stable security invoker set search_path = ''
as $function$
 with source as materialized (select lower(normalize(left(coalesce(p_text,''),200000),NFC)) as body),
 entities as (
  select 'movie'::text as kind,m.id,m.slug,m.title_en as name_en,m.title_te as name_te,m.article_aliases from public.movies m where m.status='published'
  union all select 'person',p.id,p.slug,p.name_en,p.name_te,p.article_aliases from public.people p where p.status='published'
  union all select 'company',c.id,c.slug,c.name_en,c.name_te,c.article_aliases from public.companies c where c.status='published'
 )
 select e.* from entities e cross join source s
 where exists(select 1 from unnest(array[e.name_en,e.name_te]||e.article_aliases) names(name)
  where length(names.name) between 2 and 160 and strpos(s.body,lower(normalize(names.name,NFC)))>0)
 order by e.kind,e.id limit 300;
$function$;

create or replace function public.entity_related_articles(p_kind text,p_entity_id uuid)
returns table(id uuid,slug text,headline_en text,headline_te text,hero_image_url text,published_at timestamptz,body_te text,body_en text)
language sql stable security invoker set search_path = ''
as $function$
 with target as (
  select array[m.title_en,m.title_te]||m.article_aliases as names from public.movies m where p_kind='movie' and m.id=p_entity_id and m.status='published'
  union all select array[p.name_en,p.name_te]||p.article_aliases from public.people p where p_kind='person' and p.id=p_entity_id and p.status='published'
  union all select array[c.name_en,c.name_te]||c.article_aliases from public.companies c where p_kind='company' and c.id=p_entity_id and c.status='published'
 )
 select a.id,a.slug,a.headline_en,a.headline_te,a.hero_image_url,a.published_at,a.body_te,a.body_en
 from public.news_articles a cross join target t
 where a.status='published' and a.auto_link_entities
  and exists(select 1 from unnest(t.names) n(name) where length(n.name) between 2 and 160
   and strpos(lower(normalize(coalesce(a.body_te,'')||' '||coalesce(a.body_en,'')||' '||coalesce(a.headline_te,'')||' '||coalesce(a.headline_en,''),NFC)),lower(normalize(n.name,NFC)))>0)
 order by a.published_at desc nulls last,a.id limit 60;
$function$;
revoke all on function public.article_entity_candidates(text) from public;
revoke all on function public.entity_related_articles(text,uuid) from public;
grant execute on function public.article_entity_candidates(text),public.entity_related_articles(text,uuid) to anon,authenticated,service_role;
comment on column public.people.article_aliases is 'Editor-approved alternative Telugu and English names for article links. Ambiguous aliases are not linked.';
comment on column public.news_articles.auto_link_entities is 'Render first mentions of unambiguous published profiles as internal links; never rewrite stored editorial text.';
