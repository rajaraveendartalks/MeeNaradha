import {db} from "./db";
export type ProfileGallery={id:string;slug:string;title_te:string|null;title_en:string|null;cover_image_url:string|null;category:string|null};
export function normalized(s:string|null|undefined){return (s||"").trim().toLocaleLowerCase("en").replace(/[\s_-]+/g," ")}
export async function relatedGalleries(slug:string,names:(string|null|undefined)[],categories:string[]):Promise<ProfileGallery[]>{
 if(!db)return [];
 const {data,error}=await db.from("image_galleries").select("id,slug,title_te,title_en,cover_image_url,category").eq("status","published").in("category",categories).limit(120);
 if(error){console.error("Related galleries lookup:",error.message);return []}
 const targets=new Set([slug,...names].map(normalized).filter(Boolean));
 return ((data||[]) as ProfileGallery[]).filter(g=>[g.slug,g.title_en,g.title_te].some(v=>targets.has(normalized(v)))).slice(0,12);
}
export async function matchingProfile(kind:"people"|"movies",gallery:{slug:string;title_en:string|null;title_te:string|null;category:string|null}):Promise<{slug:string;name:string}|null>{
 if(!db)return null;
 const isPerson=kind==="people";
 if(isPerson?!["actors","actresses","influencers"].includes(gallery.category||""):gallery.category!=="movie_posters")return null;
 const fields=isPerson?"slug,name_en,name_te,status":"slug,title_en,title_te,status";
 const {data,error}=await db.from(kind).select(fields).eq("status","published").limit(150);
 if(error)return null;
 const keys=new Set([gallery.slug,gallery.title_en,gallery.title_te].map(normalized).filter(Boolean));
 const matched=((data||[]) as unknown as Record<string,string|null>[]).find(p=>[p.slug,isPerson?p.name_en:p.title_en,isPerson?p.name_te:p.title_te].some(s=>keys.has(normalized(s))));
 return matched?{slug:matched.slug||"",name:(isPerson?matched.name_te||matched.name_en:matched.title_te||matched.title_en)||matched.slug||""}:null;
}
