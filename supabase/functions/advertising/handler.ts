import {EnquiryValidationError,validateEnquiry,validateAdEvent,type EnquiryForm,type AdEvent} from './validation.ts';
export class AdvertisingError extends Error{constructor(public status:number,message:string){super(message)}}
type Dependencies={authenticate:(key:string)=>Promise<boolean>;enquire:(form:EnquiryForm,key:string,ip:string)=>Promise<{reference:string;received_at:string}>;record:(event:AdEvent,ip:string)=>Promise<boolean>;now?:()=>number};
export function createAdvertisingHandler(deps:Dependencies){return async(request:Request)=>{
 const origin=request.headers.get('origin')||'',allowed=['https://www.meenarada.com','https://meenarada.com','https://mee-narada-beta.vercel.app','https://mee-narada-creator-staging.vercel.app'].includes(origin)||/^https:\/\/mee-narada-beta-[a-z0-9-]+-rajaraveendar\.vercel\.app$/.test(origin);
 if(!allowed)return new Response(null,{status:403});
 const headers={'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, apikey','cache-control':'no-store',vary:'Origin'},reply=(status:number,data:unknown)=>Response.json(data,{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return reply(405,{error:'Use the enquiry form.'});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:'Submit JSON.'});
 try{
  const key=request.headers.get('apikey')||'';if(key.length<16||key.length>2048||!await deps.authenticate(key))return reply(401,{error:'Refresh the page to reconnect the form.'});
  const reader=request.body?.getReader();if(!reader)return reply(400,{error:'The form could not be read.'});let bytes=0,body='';const decoder=new TextDecoder();
  try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>24000)return reply(413,{error:'Your enquiry is too large. Use a link for additional details.'});body+=decoder.decode(chunk.value,{stream:true})}body+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
  const raw=JSON.parse(body),ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,128);
  if(raw?.action==='event'){
   if(request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1'||/bot|spider|crawler/i.test(request.headers.get('user-agent')||''))return new Response(null,{status:204,headers});
   let event;try{event=validateAdEvent(raw.event)}catch{return reply(400,{error:'Invalid event.'})}await deps.record(event,ip);return new Response(null,{status:204,headers});
  }
  if(raw?.action!=='enquiry')return reply(400,{error:'Invalid request.'});
  const now=deps.now?.()??Date.now();if(raw.fax_number||!Number.isFinite(raw.started_at)||now-raw.started_at<2000)return reply(400,{error:'Please review the form, then submit again.'});
  if(typeof raw.submission_key!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.submission_key))return reply(400,{error:'Refresh the form and try again.'});
  const receipt=await deps.enquire(validateEnquiry(raw.form),raw.submission_key,ip);if(!receipt?.reference||!receipt.received_at)throw Error('Receipt unavailable');return reply(201,{reference:receipt.reference,received_at:receipt.received_at});
 }catch(error){
  if(error instanceof EnquiryValidationError)return reply(400,{error:error.message,field:error.field});if(error instanceof AdvertisingError)return reply(error.status,{error:error.message});if(error instanceof SyntaxError)return reply(400,{error:'The form could not be read.'});
  return reply(503,{error:'We could not save your enquiry. Your text is still here; please try again shortly.'});
 }
}}
