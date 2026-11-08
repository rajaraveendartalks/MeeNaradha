type InviteInput={email:string;name:string;role:'admin'|'editor';redirectTo:string};
type Dependencies={authorize:(token:string)=>Promise<'admin'|'forbidden'|'invalid'>;invite:(input:InviteInput)=>Promise<string>;assignRole:(id:string,role:'admin'|'editor',token:string)=>Promise<void>};
function approvedOrigin(origin:string){return ['https://www.meenarada.com','https://meenarada.com'].includes(origin)||/^https:\/\/mee-narada-beta-[a-z0-9-]+-rajaraveendar\.vercel\.app$/.test(origin)}
export function createInviteHandler(deps:Dependencies){return async(request:Request):Promise<Response>=>{
 const origin=request.headers.get('origin')||'https://www.meenarada.com';
 const headers={'content-type':'application/json','access-control-allow-origin':origin,'access-control-allow-headers':'authorization,x-client-info,apikey,content-type','access-control-allow-methods':'POST,OPTIONS','vary':'Origin'};
 const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
 if(!approvedOrigin(origin))return new Response(JSON.stringify({error:'This site is not allowed.'}),{status:403,headers:{'content-type':'application/json'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply(405,{error:'Use POST.'});
 const authorization=request.headers.get('authorization')||'',token=authorization.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)return reply(401,{error:'Sign in to continue.'});
 try{
  const access=await deps.authorize(token);if(access!=='admin')return reply(access==='invalid'?401:403,{error:access==='invalid'?'Your session expired. Sign in again.':'Administrator access is required.'});
  const text=await request.text();if(text.length>4096)return reply(413,{error:'The invitation request is too large.'});
  let body:Record<string,unknown>;try{body=JSON.parse(text)}catch{return reply(400,{error:'Invalid invitation request.'})}
  if(!body||body.action!=='invite'||typeof body.email!=='string'||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())||!['admin','editor'].includes(String(body.role)))return reply(400,{error:'Enter a valid email address and CMS role.'});
  const role=body.role as 'admin'|'editor',id=await deps.invite({email:body.email.trim().toLowerCase(),name:typeof body.name==='string'?body.name.trim().slice(0,100):'',role,redirectTo:origin+'/admin'});
  try{await deps.assignRole(id,role,token)}catch{return reply(409,{error:'The invitation was sent, but CMS access could not be assigned. Find the account in Users and set its role.',partial:true,id})}
  return reply(200,{message:'Invitation sent. The user can choose their password from the email link.',id});
 }catch(error){const message=error instanceof Error?error.message:'The invitation could not be sent.';return reply(400,{error:message})}
}}
