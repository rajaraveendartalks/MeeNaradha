-- Search the same display name that is shown in Users.
create or replace function private.studio_list_users(p_search text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.studio_require_admin();
 with matching as (
  select u.id,u.email,left(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),100) as name,
   coalesce((select role::text from public.user_roles where user_id=u.id order by case role when 'admin' then 1 when 'editor' then 2 when 'reviewer' then 3 else 4 end limit 1),'user') as role,
   u.email_confirmed_at is not null as confirmed,u.created_at,u.last_sign_in_at
  from auth.users u where length(coalesce(p_search,''))<=100 and (coalesce(btrim(p_search),'')='' or position(lower(btrim(p_search)) in lower(coalesce(u.email,'')||' '||coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''))) > 0)
 ), page_rows as (select * from matching order by created_at desc,id limit 25 offset ((greatest(1,least(coalesce(p_page,1),10000))-1)*25))
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows),'[]'::jsonb),'count',(select count(*) from matching)) into result;
 return result;
end $$;
