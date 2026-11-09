import type { SupabaseClient } from "@supabase/supabase-js";
import { articleHasContent, safeHttpUrl } from "./rich-content";

export type PostStatus = "draft" | "in_review" | "scheduled" | "published" | "archived";
export type StudioPost = {
  id:string; author_id?:string|null; slug:string; headline_te:string|null; headline_en:string; body_te:string|null; body_en:string|null;
  dek_te:string|null; dek_en:string|null; hero_image_url:string|null; category:string|null; source_name:string|null; source_url:string|null;
  is_breaking:boolean; status:PostStatus; published_at:string|null; created_at:string; updated_at:string;
};
export type PostDraft = { headline_te:string; headline_en:string; body_te:string; body_en:string; dek_te:string; dek_en:string; hero_image_url:string; category:string; slug:string; source_name:string; source_url:string; is_breaking:boolean };
export const blankDraft:PostDraft={headline_te:"",headline_en:"",body_te:"",body_en:"",dek_te:"",dek_en:"",hero_image_url:"",category:"movies",slug:"",source_name:"",source_url:"",is_breaking:false};
export const postColumns="id,author_id,slug,headline_te,headline_en,dek_te,dek_en,body_te,body_en,hero_image_url,category,source_name,source_url,is_breaking,status,published_at,created_at,updated_at";
export const listColumns="id,slug,headline_te,headline_en,hero_image_url,category,status,published_at,created_at,updated_at";
export type PostListItem=Pick<StudioPost,"id"|"slug"|"headline_te"|"headline_en"|"hero_image_url"|"category"|"status"|"published_at"|"created_at"|"updated_at">;
export const statusNames:Record<PostStatus,string>={draft:"Draft",in_review:"Pending review",scheduled:"Scheduled",published:"Published",archived:"Trash"};
export const postCategories=[["movies","Movies"],["ott","OTT"],["celebrities","Celebrities"],["box-office","Box Office"],["technology","Technology & VFX"],["politics","Politics"],["events","Events"],["interviews","Interviews"],["industry","Industry"],["other","Other"]] as const;
export function draftFromPost(post:StudioPost):PostDraft {
  return {...blankDraft,...Object.fromEntries(Object.keys(blankDraft).map(key=>[key,key==="is_breaking"?Boolean(post.is_breaking):post[key as keyof StudioPost]??""])),headline_te:post.headline_te||post.headline_en};
}
export function makeSlug(title:string):string { return title.trim().normalize("NFC").toLowerCase().replace(/[^a-z0-9\u0c00-\u0c7f]+/g,"-").replace(/^-|-$/g,"").slice(0,120)||"post"; }
export function postSlug(draft:PostDraft,original?:Pick<StudioPost,'slug'>|null):string{
  const input=draft.slug.trim();
  // Ordinary edits and clearing the optional field preserve an existing permalink.
  if(original&&(!input||draft.slug===original.slug||input===original.slug))return original.slug;
  let slug=input||makeSlug(draft.headline_en.trim()||draft.headline_te);
  if(input)try{slug=decodeURIComponent(slug)}catch{/* A literal percent remains a valid saved character. */}
  slug=slug.normalize('NFC');
  if(!slug||/[\/\\?#\s\u0000-\u001f\u007f]/u.test(slug))throw Error("The URL slug cannot contain spaces, slashes, ? or #. Enter just the words for the article address.");
  return slug;
}
export function errorMessage(error:unknown):string {
  if(error&&typeof error==="object"&&"code" in error){if(error.code==="42501")return "Your account cannot perform this action. Please contact your administrator.";if(error.code==="PGRST301")return "Your session expired. Please sign in again."}
  return error instanceof Error?error.message:error&&typeof error==="object"&&"message" in error?String(error.message):"Something went wrong. Please try again.";
}
export async function fetchPosts(client:SupabaseClient,options:{status:"all"|PostStatus;search:string;category:string;categoryValues?:string[];page:number;pageSize?:number}){
  const pageSize=options.pageSize||25;
  let query=client.from("news_articles").select(listColumns,{count:"exact"}).order("updated_at",{ascending:false}).order("id",{ascending:false});
  query=options.status==="all"?query.neq("status","archived"):query.eq("status",options.status);
  if(options.category)query=query.in("category",options.categoryValues?.length?options.categoryValues:[options.category]);
  const term=options.search.replace(/[,%()\\]/g," ").trim().slice(0,150);
  if(term)query=query.or("headline_te.ilike.%"+term+"%,headline_en.ilike.%"+term+"%");
  const {data,error,count}=await query.range(options.page*pageSize,(options.page+1)*pageSize-1);
  if(error)throw error;return {items:(data||[]) as PostListItem[],count:count||0};
}
export async function fetchPost(client:SupabaseClient,id:string):Promise<StudioPost>{
  const {data,error}=await client.from("news_articles").select(postColumns).eq("id",id).maybeSingle();
  if(error)throw error;if(!data)throw Error("This post was not found, or your account cannot open it.");return data as StudioPost;
}
export function postPayload(draft:PostDraft,status:PostStatus,original?:StudioPost|null,now=new Date().toISOString()){
  const headline=draft.headline_te.trim()||draft.headline_en.trim();
  if(!headline)throw Error("Add a title before saving.");
  if(!draft.category.trim())throw Error("Choose a category before saving.");
  const bodyTe=articleHasContent(draft.body_te)?draft.body_te:null,bodyEn=articleHasContent(draft.body_en)?draft.body_en:null;
  if(status==="published"&&!bodyTe&&!bodyEn)throw Error("Add article content before publishing.");
  const sourceUrl=draft.source_url.trim(),hero=draft.hero_image_url.trim();
  if(sourceUrl&&!safeHttpUrl(sourceUrl))throw Error("Enter a valid source URL starting with https:// or http://.");
  if(hero&&!safeHttpUrl(hero))throw Error("Choose a featured image or enter a valid image URL.");
  const slug=postSlug(draft,original);
  return {headline_te:draft.headline_te.trim()||null,headline_en:draft.headline_en.trim()||headline,body_te:bodyTe,body_en:bodyEn,dek_te:draft.dek_te.trim()||null,dek_en:draft.dek_en.trim()||null,hero_image_url:hero||null,category:draft.category||"movies",slug,source_name:draft.source_name.trim()||null,source_url:sourceUrl||null,is_breaking:draft.is_breaking,status,published_at:status==="published"?(original?.published_at||now):(original?.published_at||null)};
}
export async function savePost(client:SupabaseClient,draft:PostDraft,status:PostStatus,original?:StudioPost|null,authorId?:string|null):Promise<StudioPost>{
  const payload:ReturnType<typeof postPayload>&{author_id?:string|null}=postPayload(draft,status,original);
  if(authorId!==undefined)payload.author_id=authorId;
  const run=()=>original?client.from("news_articles").update(payload).eq("id",original.id).eq("updated_at",original.updated_at).select(postColumns).maybeSingle():client.from("news_articles").insert(payload).select(postColumns).single();
  let result=await run();
  if(!original&&!draft.slug.trim()&&result.error?.code==="23505"){payload.slug+="-"+crypto.randomUUID().slice(0,8);result=await run()}
  if(result.error?.code==="23505")throw Error("This URL is already in use. Choose another URL slug under Advanced options.");
  if(result.error)throw result.error;
  if(!result.data)throw Error("This post changed in another session. Reload it before saving so those changes are preserved.");
  return result.data as StudioPost;
}
export async function changePostStatuses(client:SupabaseClient,ids:string[],status:"archived"|"draft"|"in_review"):Promise<number>{
  if(!ids.length)return 0;
  const {data,error}=await client.from("news_articles").update({status}).in("id",ids).select("id");
  if(error)throw error;if(data?.length!==ids.length)throw Error("Some posts could not be updated. Refresh the list to check your permissions.");
  return data.length;
}
export const mediaBucket=process.env.NEXT_PUBLIC_GALLERY_BUCKET||"media";
export type MediaItem={id:string|null;name:string;path:string;url:string;size:number;folder:boolean};
export async function listMedia(client:SupabaseClient,folder:string,search:string,offset:number):Promise<MediaItem[]>{
  const {data,error}=await client.storage.from(mediaBucket).list(folder,{limit:60,offset,sortBy:{column:"name",order:"asc"},...(search.trim()?{search:search.trim()}: {})});
  if(error)throw error;
  return (data||[]).map(item=>{const path=[folder,item.name].filter(Boolean).join("/");return {id:item.id,name:item.name,path,url:item.id?client.storage.from(mediaBucket).getPublicUrl(path).data.publicUrl:"",size:Number(item.metadata?.size)||0,folder:!item.id}});
}
export async function uploadMedia(client:SupabaseClient,file:File,folder=""):Promise<MediaItem>{
  if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type))throw Error("Choose a JPG, PNG, WebP or GIF image.");
  if(file.size>8*1024*1024)throw Error("Each image must be 8 MB or smaller.");
  if(folder.split("/").some(part=>part===".."||part==="."))throw Error("Invalid media folder.");
  const filename=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").replace(/^\.+/,"").slice(-130)||"image";
  const path=[folder,crypto.randomUUID()+"-"+filename].filter(Boolean).join("/");
  const {data,error}=await client.storage.from(mediaBucket).upload(path,file,{upsert:false,contentType:file.type,cacheControl:"3600"});
  if(error)throw error;
  return {id:data.id||data.path,name:file.name,path:data.path,url:client.storage.from(mediaBucket).getPublicUrl(data.path).data.publicUrl,size:file.size,folder:false};
}
