import {createPublishingRequestHandler,PublicationSubmitError} from './handler.ts';
import type {PublicationForm} from './validation.ts';
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
let salt='',saltAt=0;const checkedKeys=new Map<string,number>();
async function rpc(name:string,body:unknown){
  const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok){const error=await response.json().catch(()=>({}));if(error.code==='P0429')throw new PublicationSubmitError(429,'Several requests have been received recently. Please try again later.');if(error.code==='P0409')throw new PublicationSubmitError(409,'This request was already submitted with different details. Refresh to send a new request.');if(error.code==='22023')throw new PublicationSubmitError(400,'Please check the form details and category, then try again.');throw Error('Publication storage unavailable')}
  return response.json();
}
async function authenticate(key:string){
  if((checkedKeys.get(key)||0)>Date.now())return true;
  const response=await fetch(url+'/rest/v1/news_articles?select=id&limit=0',{method:'HEAD',headers:{apikey:key},signal:AbortSignal.timeout(5000)});
  if(!response.ok)return false;if(checkedKeys.size>=50)checkedKeys.clear();checkedKeys.set(key,Date.now()+300000);return true;
}
async function hash(value:string){const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
async function submit(form:PublicationForm,submissionKey:string,ip:string){
  if(!salt||Date.now()-saltAt>3600000){salt=await rpc('publishing_request_ingest_config',{});saltAt=Date.now()}
  const day=new Date(Date.now()+330*60000).toISOString().slice(0,10),[client,email,payload]=await Promise.all([hash(day+'|ip|'+ip),hash(day+'|email|'+form.email),hash('payload|'+JSON.stringify(form))]);
  return rpc('submit_publication_request',{p_form:form,p_key:submissionKey,p_client_hash:client,p_email_hash:email,p_payload_hash:payload});
}
Deno.serve(createPublishingRequestHandler({authenticate,submit}));
