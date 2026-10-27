-- Staging validation required before applying to any shared/production database.
-- Keep the private role helper unavailable to anonymous callers.
alter policy videos_read on public.videos to authenticated
using ((select private.current_app_role()) = any (array['editor'::public.app_role,'admin'::public.app_role]));
create policy videos_public_read on public.videos for select to anon, authenticated
using (status = 'published'::public.content_status);

-- Approved submissions are immutable through the existing policies and trigger.
-- A SELECT FOR UPDATE would additionally require an UPDATE policy and hide these
-- approved rows from the administrator. Publishing reads them; it does not edit them.
CREATE OR REPLACE FUNCTION public.publish_creator_video(p_submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.creator_submissions%rowtype; v_id uuid; yt text; slug_base text;
begin
 if (select private.current_app_role()) is distinct from 'admin'::public.app_role then raise exception 'Administrator access required'; end if;
 select * into s from public.creator_submissions where id=p_submission_id and status='approved';
 if not found then raise exception 'Approved creator submission not found'; end if;
 if s.content_type not in ('trailer','song','short_film','reel') then raise exception 'Unsupported video content type'; end if;
 if s.video_url is null or s.video_url !~* '^https://(www[.])?(youtube[.]com/watch[?]v=|youtu[.]be/|youtube[.]com/shorts/)' then raise exception 'Valid YouTube URL required'; end if;
 yt:=substring(s.video_url from '(?:v=|youtu[.]be/|shorts/)([A-Za-z0-9_-]{11})');
 if yt is null then raise exception 'Could not parse YouTube ID'; end if;
 slug_base:=trim(both '-' from regexp_replace(lower(coalesce(nullif(s.title_en,''),'video')),'[^a-z0-9]+','-','g'));
 insert into public.videos(slug,title_en,title_te,description_en,description_te,platform,external_id,video_url,thumbnail_url,status,published_at,creator_submission_id,content_type)
 values(left(coalesce(nullif(slug_base,''),'video'),65)||'-'||left(replace(s.id::text,'-',''),10),s.title_en,s.title_te,s.description_en,s.description_te,'youtube',yt,s.video_url,'https://img.youtube.com/vi/'||yt||'/hqdefault.jpg','published',now(),s.id,s.content_type)
 on conflict (creator_submission_id) do update set creator_submission_id=excluded.creator_submission_id
 returning id into v_id;
 return v_id;
end $function$;

revoke execute on function public.publish_creator_video(uuid) from public, anon;
grant execute on function public.publish_creator_video(uuid) to authenticated;
