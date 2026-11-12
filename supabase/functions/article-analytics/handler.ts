export type EventInput={article_id:string;kind:'view'|'share_click';platform:string;visitor_id:string};
type Dependencies={authenticate:(key:string)=>Promise<boolean>;record:(input:EventInput,ip:string)=>Promise<boolean>};
export const allowedAnalyticsOrigin=(origin:string)=>['https://www.meenarada.com','https://meenarada.com','https://mee-narada-beta.vercel.app','https://mee-narada-creator-staging.vercel.app','https://mobile.meenarada.com','capacitor://mobile.meenarada.com','https://mee-narada-mobile-app-design.rajaraveendartalks.chatgpt.site'].includes(origin)||/^https:\/\/mee-narada-beta-[a-z0-9-]+-rajaraveendar\.vercel\.app$/.test(origin);
const platforms=new Set(['facebook','x','instagram','whatsapp','reddit','telegram','linkedin','pinterest','email','copy','more']);
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
class PayloadTooLarge extends Error{}
async function requestBody(request:Request){
  const reader=request.body?.getReader();if(!reader)return '';
  const decoder=new TextDecoder();let bytes=0,result='';
  try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4096)throw new PayloadTooLarge();result+=decoder.decode(value,{stream:true})}return result+decoder.decode()}finally{await reader.cancel().catch(()=>{})}
}
export function createAnalyticsHandler(deps:Dependencies){return async(request:Request)=>{
  const origin=request.headers.get('origin')||'',headers:Record<string,string>={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, apikey','Vary':'Origin','Cache-Control':'no-store'};
  if(!allowedAnalyticsOrigin(origin))return new Response(null,{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return new Response(null,{status:405,headers});
  if(request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1'||/bot|spider|crawler|headless|preview/i.test(request.headers.get('user-agent')||''))return new Response(null,{status:204,headers});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return new Response(null,{status:415,headers});
  try{
    const body=await requestBody(request);
    const input=JSON.parse(body) as EventInput;
    if(!input||!uuid(input.article_id)||!uuid(input.visitor_id)||!((input.kind==='view'&&input.platform==='none')||(input.kind==='share_click'&&platforms.has(input.platform))))return new Response(null,{status:400,headers});
    const key=request.headers.get('apikey')||'';if(key.length<16||key.length>2048||!await deps.authenticate(key))return new Response(null,{status:401,headers});
    const accepted=await deps.record(input,(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,128));
    return new Response(null,{status:accepted?204:202,headers});
  }catch(error){return new Response(null,{status:error instanceof PayloadTooLarge?413:error instanceof SyntaxError?400:503,headers})}
}}
