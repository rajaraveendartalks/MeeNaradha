import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createInviteHandler} from './handler.ts';

const url=Deno.env.get('SUPABASE_URL')!,publicKey=Deno.env.get('SUPABASE_ANON_KEY')!,adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const options={auth:{persistSession:false,autoRefreshToken:false}};
const caller=(token:string)=>createClient(url,publicKey,{...options,global:{headers:{Authorization:'Bearer '+token}}});
const admin=createClient(url,adminKey,options);
Deno.serve(createInviteHandler({
 async authorize(token){
  const client=caller(token),result=await client.auth.getUser(token);if(result.error||!result.data.user)return 'invalid';
  const roles=await client.from('user_roles').select('role').eq('user_id',result.data.user.id).eq('role','admin').limit(1);
  if(roles.error)throw Error('Administrator access could not be verified. Please try again.');return roles.data?.length?'admin':'forbidden';
 },
 async invite(input){
  const result=await admin.auth.admin.inviteUserByEmail(input.email,{data:{full_name:input.name,studio_invited:true},redirectTo:input.redirectTo});
  if(result.error)throw Error(result.error.message);if(!result.data.user)throw Error('The invitation could not be created.');return result.data.user.id;
 },
 async assignRole(id,role,token){const result=await caller(token).rpc('studio_set_user_role',{p_user_id:id,p_role:role});if(result.error)throw result.error}
}));
