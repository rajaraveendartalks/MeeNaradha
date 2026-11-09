import type {SupabaseClient} from '@supabase/supabase-js';
import {titleOf} from './db';
import {videoThumbnail,type PublicVideo} from './public-videos';
export const sidebarKinds=['stories','galleries','trailers'] as const;
export type SidebarKind=typeof sidebarKinds[number];
export type SidebarModule={kind:SidebarKind;title:string;enabled:boolean;ids:string[]};
export type ArticleLayout={enabled:boolean;modules:SidebarModule[]};
export type LayoutRecord={id:string;article_id:string|null;use_default:boolean;config:ArticleLayout;revision:number;updated_at:string};
export type SidebarItem={id:string;title:string;url:string;image:string|null;kind:SidebarKind};
export const sidebarLimits={stories:6,galleries:3,trailers:2};
export const defaultArticleLayout=():ArticleLayout=>({enabled:true,modules:[{kind:'stories',title:'ఎడిటర్ ఎంపికలు',enabled:true,ids:[]},{kind:'galleries',title:'ఫోటో గ్యాలరీలు',enabled:true,ids:[]},{kind:'trailers',title:'ట్రైలర్లు',enabled:true,ids:[]}]});
export const validUuid=(value:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function validateArticleLayout(value:ArticleLayout):ArticleLayout{
 if(typeof value.enabled!=='boolean'||!Array.isArray(value.modules)||value.modules.length!==3||new Set(value.modules.map(row=>row.kind)).size!==3)throw Error('Use one stories, galleries and trailers section.');
 for(const row of value.modules)if(!sidebarKinds.includes(row.kind)||typeof row.enabled!=='boolean'||!row.title.trim()||row.title.length>80||!Array.isArray(row.ids)||row.ids.length>sidebarLimits[row.kind]||new Set(row.ids).size!==row.ids.length||row.ids.some(id=>!validUuid(id)))throw Error('Check the section title and selected items.');
 return {enabled:value.enabled,modules:value.modules.map(row=>({...row,title:row.title.trim(),ids:[...row.ids]}))};
}
export async function loadLayoutRecords(client:SupabaseClient,scope='default'){
 const result=await client.from('article_sidebar_layouts').select('id,article_id,use_default,config,revision,updated_at').in('id',scope==='default'?['default']:['default',scope]);if(result.error)throw result.error;return (result.data||[]) as LayoutRecord[];
}
export function effectiveLayout(records:LayoutRecord[],articleId:string){return (records.find(row=>row.id===articleId&&!row.use_default)||records.find(row=>row.id==='default'))?.config||defaultArticleLayout()}
export async function saveArticleLayout(client:SupabaseClient,scope:string,config:ArticleLayout,useDefault:boolean,original:LayoutRecord|null){
 const payload={id:scope,article_id:scope==='default'?null:scope,use_default:scope==='default'?false:useDefault,config:validateArticleLayout(config)};
 const result=original?await client.from('article_sidebar_layouts').update(payload).eq('id',scope).eq('revision',original.revision).select().maybeSingle():await client.from('article_sidebar_layouts').insert(payload).select().single();
 if(result.error?.code==='23505')throw Error('This sidebar was created in another session. Reload it first.');if(result.error)throw result.error;if(!result.data)throw Error('This sidebar changed in another session. Reload it before saving.');return result.data as LayoutRecord;
}
const tables={stories:'news_articles',galleries:'image_galleries',trailers:'videos'};
const columns={stories:'id,slug,headline_te,headline_en,hero_image_url',galleries:'id,slug,title_te,title_en,cover_image_url',trailers:'id,slug,title_te,title_en,thumbnail_url,content_type,external_id,video_url'};
// These allowlisted records are used by both the manual picker and public rendering.
function item(kind:SidebarKind,row:Record<string,unknown>):SidebarItem{
 return {id:String(row.id),title:titleOf(row),url:(kind==='stories'?'/article/':kind==='galleries'?'/gallery/':'/videos/')+encodeURIComponent(String(row.slug)),image:(kind==='stories'?row.hero_image_url:kind==='galleries'?row.cover_image_url:videoThumbnail(row as unknown as PublicVideo)) as string|null,kind};
}
export async function sidebarItems(client:SupabaseClient,kind:SidebarKind,ids:string[]):Promise<SidebarItem[]>{
 if(!ids.length)return [];let query=client.from(tables[kind]).select(columns[kind]).eq('status','published').in('id',ids);if(kind==='trailers')query=query.eq('content_type','trailer');const result=await query;if(result.error)throw result.error;
 const rows=(result.data||[]) as unknown as Record<string,unknown>[];return ids.flatMap(id=>{const found=rows.find(row=>row.id===id);return found?[item(kind,found)]:[]});
}
export async function searchSidebarItems(client:SupabaseClient,kind:SidebarKind,search:string,page:number){
 let query=client.from(tables[kind]).select(columns[kind],{count:'exact'}).eq('status','published').order('created_at',{ascending:false}).order('id',{ascending:false});
 if(kind==='trailers')query=query.eq('content_type','trailer');
 const term=search.replace(/[(),.%\\]/g,' ').trim().slice(0,100),prefix=kind==='stories'?'headline':'title';if(term)query=query.or(prefix+'_te.ilike.%'+term+'%,'+prefix+'_en.ilike.%'+term+'%');
 const result=await query.range((page-1)*20,page*20-1);if(result.error)throw result.error;return {items:((result.data||[]) as unknown as Record<string,unknown>[]).map(row=>item(kind,row)),count:result.count||0};
}
export async function loadArticleSidebar(client:SupabaseClient,articleId:string){
 const config=effectiveLayout(await loadLayoutRecords(client,articleId),articleId);if(!config.enabled)return [];
 return Promise.all(config.modules.filter(row=>row.enabled).map(async row=>({...row,items:await sidebarItems(client,row.kind,row.ids.filter(id=>id!==articleId))}))).then(rows=>rows.filter(row=>row.items.length));
}
