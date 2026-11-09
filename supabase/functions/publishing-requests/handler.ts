import {validatePublicationForm,PublicationValidationError,type PublicationForm} from './validation.ts';
export type PublicationReceipt={reference:string;received_at:string};
type Dependencies={authenticate:(key:string)=>Promise<boolean>;submit:(form:PublicationForm,key:string,ip:string)=>Promise<PublicationReceipt>;now?:()=>number};
export class PublicationSubmitError extends Error{constructor(public status:number,message:string){super(message)}}
const originAllowed=(origin:string)=>['https://www.meenarada.com','https://meenarada.com','https://mee-narada-beta.vercel.app','https://mee-narada-creator-staging.vercel.app'].includes(origin)||/^https:\/\/mee-narada-beta-[a-z0-9-]+-rajaraveendar\.vercel\.app$/.test(origin);
class BodyTooLarge extends Error{}
async function readBody(request:Request){const reader=request.body?.getReader();if(!reader)return '';const decoder=new TextDecoder();let bytes=0,result='';try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>131072)throw new BodyTooLarge();result+=decoder.decode(value,{stream:true})}return result+decoder.decode()}finally{await reader.cancel().catch(()=>{})}}
export function createPublishingRequestHandler(deps:Dependencies){return async(request:Request)=>{
  const origin=request.headers.get('origin')||'';
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, apikey','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(status:number,body:unknown)=>Response.json(body,{status,headers});
  if(!originAllowed(origin))return new Response(null,{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,{error:'Use the publishing request form.'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:'Submit the form as JSON.'});
  try{
    const key=request.headers.get('apikey')||'';
    if(key.length<16||key.length>2048||!await deps.authenticate(key))return reply(401,{error:'The form connection could not be verified. Refresh and try again.'});
    const raw=JSON.parse(await readBody(request));
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return reply(400,{error:'Check the form and try again.'});
    if(raw.fax_number||!Number.isFinite(raw.started_at)||(deps.now?.()??Date.now())-raw.started_at<2000||raw.started_at>(deps.now?.()??Date.now()))return reply(400,{error:'Please review the form, then submit it again.'});
    if(typeof raw.submission_key!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.submission_key))return reply(400,{error:'Refresh the form and try again.'});
    const form=validatePublicationForm(raw.form),receipt=await deps.submit(form,raw.submission_key,(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,128));
    if(!receipt?.reference||!receipt.received_at)throw Error('Missing receipt');
    return reply(201,{reference:receipt.reference,received_at:receipt.received_at});
  }catch(error){
    if(error instanceof PublicationValidationError)return reply(400,{error:error.message,field:error.field});
    if(error instanceof PublicationSubmitError)return reply(error.status,{error:error.message});
    if(error instanceof BodyTooLarge)return reply(413,{error:'The form is too large. Use a draft link for a longer article.'});
    if(error instanceof SyntaxError)return reply(400,{error:'The form could not be read. Refresh and try again.'});
    return reply(503,{error:'We could not save your request. Your text is still here; please try again shortly.'});
  }
}}
