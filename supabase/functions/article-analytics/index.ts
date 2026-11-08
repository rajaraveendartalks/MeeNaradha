import {createAnalyticsHandler,type EventInput} from './handler.ts';
const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const checkedKeys=new Map<string,number>();let salt='',saltAt=0;
async function rpc(name:string,body:unknown){
  const response=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok)throw Error('Analytics storage unavailable');return response.json();
}
async function authenticate(key:string){
  const until=checkedKeys.get(key);if(until&&until>Date.now())return true;
  // Validate the public API key with this project's gateway. No visitor session is needed.
  const response=await fetch(url+'/rest/v1/news_articles?select=id&limit=0',{method:'HEAD',headers:{apikey:key},signal:AbortSignal.timeout(5000)});
  if(!response.ok)return false;
  if(checkedKeys.size>=50)checkedKeys.clear();checkedKeys.set(key,Date.now()+300000);return true;
}
async function hash(value:string){
  const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function record(input:EventInput,ip:string){
  if(!salt||Date.now()-saltAt>3600000){salt=await rpc('article_analytics_ingest_config',{});saltAt=Date.now()}
  const day=new Date(Date.now()+330*60000).toISOString().slice(0,10);
  const [visitor,client]=await Promise.all([hash(day+'|'+input.article_id+'|'+input.visitor_id),hash(day+'|'+ip)]);
  return rpc('record_article_event',{p_article_id:input.article_id,p_kind:input.kind,p_platform:input.platform,p_visitor_hash:visitor,p_client_hash:client});
}
Deno.serve(createAnalyticsHandler({authenticate,record}));
