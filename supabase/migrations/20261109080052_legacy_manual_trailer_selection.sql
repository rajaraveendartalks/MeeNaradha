-- Older published videos remain available for manual trailer selection.
-- Existing video classifications and publication states are preserved.
create or replace function private.guard_article_sidebar() returns trigger language plpgsql set search_path='' as $$
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
   if (kind='stories' and not exists(select 1 from public.news_articles where id=chosen and status='published')) or (kind='galleries' and not exists(select 1 from public.image_galleries where id=chosen and status='published')) or (kind='trailers' and not exists(select 1 from public.videos where id=chosen and status='published' and (content_type='trailer' or content_type is null))) then raise exception 'Select published stories, galleries and trailers only' using errcode='22023';end if;
  end loop;
 end loop;
 new.revision:=case when tg_op='UPDATE' then old.revision+1 else 0 end;new.updated_at:=clock_timestamp();return new;
end $$;
