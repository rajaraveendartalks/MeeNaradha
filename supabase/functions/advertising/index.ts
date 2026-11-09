import {createAdvertisingHandler,AdvertisingError} from './handler.ts';
import type {AdEvent,EnquiryForm} from './validation.ts';
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const checkedKeys=new Map<string,number>();let salt='',saltAt=0;
async function rpc(name:string,payload:unknown){
 const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const error=await response.json().catch(()=>({}));if(error.code==='P0429')throw new AdvertisingError(429,'Several enquiries have arrived recently. Please try again later.');if(error.code==='P0409')throw new AdvertisingError(409,'This request was already saved with different details. Refresh to start a new enquiry.');if(error.code==='22023')throw new AdvertisingError(400,'Please check the enquiry details and dates.');throw Error('Advertising storage unavailable')}return response.json();
}
async function authenticate(key:string){if((checkedKeys.get(key)||0)>Date.now())return true;const response=await fetch(url+'/rest/v1/site_ad_settings?select=id&limit=0',{method:'HEAD',headers:{apikey:key},signal:AbortSignal.timeout(5000)});if(!response.ok)return false;if(checkedKeys.size>=50)checkedKeys.clear();checkedKeys.set(key,Date.now()+300000);return true}
async function hashes(values:string[]){if(!salt||Date.now()-saltAt>3600000){salt=await rpc('advertising_ingest_config',{});saltAt=Date.now()}const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Promise.all(values.map(async value=>[...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('')))}
const day=()=>new Date(Date.now()+330*60000).toISOString().slice(0,10);
async function enquire(form:EnquiryForm,key:string,ip:string){const [client,email,payload]=await hashes([day()+'|ip|'+ip,day()+'|email|'+form.email,'enquiry|'+JSON.stringify(form)]);return rpc('submit_advertiser_enquiry',{p_form:form,p_key:key,p_client_hash:client,p_email_hash:email,p_payload_hash:payload})}
async function record(event:AdEvent,ip:string){const [display,client]=await hashes([day()+'|display|'+event.display_id,day()+'|ip|'+ip]);return rpc('record_ad_event',{p_campaign_id:event.campaign_id,p_placement:event.placement,p_kind:event.kind,p_display_hash:display,p_client_hash:client,p_article_id:event.article_id,p_category:event.category,p_device:event.device})}
Deno.serve(createAdvertisingHandler({authenticate,enquire,record}));
