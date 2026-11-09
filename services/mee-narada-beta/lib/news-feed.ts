import {XMLParser} from 'fast-xml-parser';
import {createHash} from 'node:crypto';
import {safeHttpUrl} from './rich-content';
import {newsQuery,type NewsFeed,type NewsItem,type NewsScope,type NewsTopic} from './news-desk';

const parser=new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false,trimValues:true,ignoreDeclaration:true,ignorePiTags:true});
function text(value:unknown):string{
  const raw=typeof value==='string'?value:value&&typeof value==='object'&&'#text' in value?String((value as {'#text':unknown})['#text']):'';
  return raw.replace(/&#(x[0-9a-f]+|\d+);/gi,(match,code)=>{const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):''}).replace(/&(amp|quot|apos|lt|gt);/g,(_,entity)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[entity as 'amp']||'')).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
}
export function parseNewsFeed(xml:string,topic:NewsTopic,now=new Date()):NewsItem[]{
  if(xml.length>1_500_000||/<!\s*(?:DOCTYPE|ENTITY)/i.test(xml))throw Error('The news provider returned an unsupported feed.');
  const root=parser.parse(xml),items=root?.rss?.channel?.item;if(!items)return [];
  const seen=new Set<string>();
  return (Array.isArray(items)?items:[items]).slice(0,150).flatMap((item:Record<string,unknown>)=>{
    const url=safeHttpUrl(text(item.link)),published=Date.parse(text(item.pubDate)),source=text(item.source).slice(0,120)||'News source';
    let title=text(item.title).slice(0,350);const suffix=' - '+source;if(title.endsWith(suffix))title=title.slice(0,-suffix.length);
    if(!url||!title||!Number.isFinite(published)||published>now.getTime()+300000||published<now.getTime()-48*3600000||seen.has(url))return [];
    seen.add(url);return [{id:createHash('sha256').update(url).digest('hex').slice(0,24),url,title,source,published_at:new Date(published).toISOString(),topic}];
  });
}
export async function fetchNewsFeed(topic:NewsTopic,scope:NewsScope):Promise<NewsFeed>{
  const url='https://news.google.com/rss/search?'+new URLSearchParams({q:newsQuery(topic,scope),hl:'en-IN',gl:'IN',ceid:'IN:en'}).toString();
  const response=await fetch(url,{headers:{Accept:'application/rss+xml, application/xml;q=0.9'},signal:AbortSignal.timeout(15000),next:{revalidate:900}});
  if(!response.ok)throw Error('The news provider is temporarily unavailable. Try again shortly or open the source search.');
  const limit=1_500_000,reader=response.body?.getReader();if(!reader)throw Error('The news feed could not be read.');
  let bytes=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit)throw Error('The news feed is too large.');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength}
  const fetched_at=new Date().toISOString();return {items:parseNewsFeed(new TextDecoder().decode(buffer),topic,new Date(fetched_at)),fetched_at,provider:'Google News RSS'};
}
