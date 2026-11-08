create table public.homepage_settings (
  id text primary key check (id in ('draft','published')),
  config jsonb not null check (
    jsonb_typeof(config)='object' and config @> '{"version":1}'::jsonb
    and octet_length(config::text)<=24576
  ),
  revision integer not null default 0 check (revision>=0),
  updated_at timestamptz not null default now()
);
alter table public.homepage_settings enable row level security;
revoke all on public.homepage_settings from anon,authenticated;
grant select on public.homepage_settings to anon,authenticated;
grant update on public.homepage_settings to authenticated;

create policy homepage_published_read on public.homepage_settings
  for select to anon,authenticated using (id='published');
create policy homepage_staff_read on public.homepage_settings
  for select to authenticated using (exists (
    select 1 from public.user_roles ur
    where ur.user_id=(select auth.uid()) and ur.role in ('admin','editor')
  ));
create policy homepage_staff_update on public.homepage_settings
  for update to authenticated using (exists (
    select 1 from public.user_roles ur
    where ur.user_id=(select auth.uid()) and ur.role in ('admin','editor')
  )) with check (exists (
    select 1 from public.user_roles ur
    where ur.user_id=(select auth.uid()) and ur.role in ('admin','editor')
  ));

-- Start with the current automatic homepage, without changing article or media records.
insert into public.homepage_settings(id,config)
select id,'{"version":1,"intro":{"eyebrow":"మీ తెలుగు ఎంటర్‌టైన్‌మెంట్ హబ్","title":"తాజా వార్తలు","caption":"సినిమా ప్రపంచం మీ ముందుకు"},"ticker":{"enabled":true,"label":"తాజా అప్‌డేట్స్","text":"తెలుగు సినిమా • OTT • సెలబ్రిటీలు • వినోద వార్తలు"},"featured":{"enabled":true,"title":"ట్రెండింగ్ వార్తలు","leadId":null,"storyIds":[]},"sections":[{"id":"videos","title":"వీడియోలు","enabled":true,"limit":6,"preset":"lead-headlines"},{"id":"movies","title":"సినిమా వార్తలు","enabled":true,"limit":10,"preset":"lead-cards"},{"id":"ott","title":"OTT అప్‌డేట్స్","enabled":true,"limit":5,"preset":"lead-headlines"},{"id":"celebrities","title":"సెలబ్రిటీ వార్తలు","enabled":true,"limit":10,"preset":"lead-cards"},{"id":"box-office","title":"బాక్సాఫీస్","enabled":true,"limit":12,"preset":"compact"},{"id":"technology","title":"టెక్నాలజీ & VFX","enabled":true,"limit":12,"preset":"compact"},{"id":"politics","title":"రాజకీయాలు","enabled":true,"limit":5,"preset":"lead-headlines"},{"id":"galleries","title":"ఫోటో గ్యాలరీలు","enabled":true,"limit":3,"preset":"lead-cards"}]}'::jsonb from (values ('draft'),('published')) as versions(id);

-- One transaction protects draft/live updates and detects edits made in another session.
create function public.save_homepage_settings(
  p_config jsonb,p_draft_revision integer,p_published_revision integer,p_publish boolean default false
) returns jsonb language plpgsql security invoker set search_path='' as $function$
declare
  draft_row public.homepage_settings%rowtype;
  published_row public.homepage_settings%rowtype;
  saved_at timestamptz:=clock_timestamp();
begin
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id=(select auth.uid()) and ur.role in ('admin','editor')
  ) then raise exception 'Editor access is required' using errcode='42501'; end if;
  if p_config is null or jsonb_typeof(p_config)<>'object' or p_publish is null then
    raise exception 'Invalid homepage settings' using errcode='22023';
  end if;
  select * into draft_row from public.homepage_settings where id='draft' for update;
  select * into published_row from public.homepage_settings where id='published' for update;
  if draft_row.id is null or published_row.id is null then
    raise exception 'Homepage settings are unavailable' using errcode='P0002';
  end if;
  if draft_row.revision is distinct from p_draft_revision or published_row.revision is distinct from p_published_revision then
    raise exception 'The homepage changed in another session' using errcode='40001';
  end if;
  update public.homepage_settings set config=p_config,revision=revision+1,updated_at=saved_at where id='draft' returning * into draft_row;
  if p_publish then
    update public.homepage_settings set config=p_config,revision=revision+1,updated_at=saved_at where id='published' returning * into published_row;
  end if;
  return jsonb_build_object('draft',to_jsonb(draft_row),'published',to_jsonb(published_row));
end
$function$;
revoke all on function public.save_homepage_settings(jsonb,integer,integer,boolean) from public,anon;
grant execute on function public.save_homepage_settings(jsonb,integer,integer,boolean) to authenticated;
