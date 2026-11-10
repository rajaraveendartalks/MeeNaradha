export const reactionKinds=['like','heart','angry','lol','kiss','egg'] as const;
type ReactionKind=typeof reactionKinds[number];
export type ReactionInput={article_id:string;browser_id:string|null;reaction:ReactionKind|null;operation_id:string|null;version:number};
export class ReactionError extends Error{constructor(public status:number,message:string,public state?:unknown){super(message)}}
type Dependencies={authenticate:(key:string)=>Promise<boolean>;read:(input:ReactionInput)=>Promise<unknown>;react:(input:ReactionInput,ip:string)=>Promise<unknown>};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const randomId=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function validateReactionInput(raw:unknown):{action:'read'|'react';input:ReactionInput}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ReactionError(400,'Choose a valid article reaction.');const value=raw as Record<string,unknown>;
 if(!['read','react'].includes(String(value.action))||typeof value.article_id!=='string'||!uuid.test(value.article_id))throw new ReactionError(400,'Choose a valid article.');
 const browser=value.browser_id==null?null:value.browser_id;if(browser!==null&&(typeof browser!=='string'||!randomId.test(browser)))throw new ReactionError(400,'Refresh the article to reconnect your reaction.');
 if(value.action==='read')return {action:'read',input:{article_id:value.article_id,browser_id:browser as string|null,reaction:null,operation_id:null,version:0}};
 if(!browser||value.reaction!==null&&!reactionKinds.includes(value.reaction as ReactionKind)||typeof value.operation_id!=='string'||!randomId.test(value.operation_id)||typeof value.version!=='number'||!Number.isSafeInteger(value.version)||value.version<0||value.version>2147483647)throw new ReactionError(400,'Choose a valid reaction and try again.');
 return {action:'react',input:{article_id:value.article_id,browser_id:browser as string,reaction:value.reaction as ReactionKind|null,operation_id:value.operation_id,version:value.version}};
}
export function createReactionHandler(deps:Dependencies){return async(request:Request)=>{
 const origin=request.headers.get('origin')||'',allowed=['https://www.meenarada.com','https://meenarada.com','https://mee-narada-beta.vercel.app','https://mee-narada-creator-staging.vercel.app'].includes(origin)||/^https:\/\/mee-narada-(?:beta|creator-staging)-[a-z0-9-]+-rajaraveendar\.vercel\.app$/.test(origin);
 if(!allowed)return new Response(null,{status:403});
 const headers={'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, apikey','cache-control':'no-store',vary:'Origin'},reply=(status:number,value:unknown)=>Response.json(value,{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return reply(405,{error:'Use the article reaction buttons.'});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:'Submit JSON.'});
 try{
  const key=request.headers.get('apikey')||'';if(key.length<16||key.length>2048||!await deps.authenticate(key))return reply(401,{error:'Refresh the article to reconnect reactions.'});
  const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Choose a reaction.'});let size=0,text='';const decoder=new TextDecoder();
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>2048)return reply(413,{error:'The reaction request is too large.'});text+=decoder.decode(next.value,{stream:true})}text+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
  const {action,input}=validateReactionInput(JSON.parse(text));if(action==='read')return reply(200,await deps.read(input));
  const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,128);return reply(200,await deps.react(input,ip));
 }catch(error){if(error instanceof ReactionError)return reply(error.status,{error:error.message,...(error.state?{state:error.state}:{})});if(error instanceof SyntaxError)return reply(400,{error:'The reaction could not be read.'});return reply(503,{error:'We could not confirm your reaction. Retry to check and save the same choice.'})}
}}
