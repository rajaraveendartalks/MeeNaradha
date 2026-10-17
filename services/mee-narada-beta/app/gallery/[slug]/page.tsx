import Link from "next/link";
import {notFound} from "next/navigation";
import {db,titleOf,Gallery} from "../../../lib/db";
export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug:rawSlug}=await params;
 let slug=rawSlug;
 try{slug=decodeURIComponent(rawSlug)}catch{}
 if(!db){console.error("Public gallery: Supabase client is not configured");notFound()}
 // Fetch the public gallery by slug first. Do not hide database errors as a 404.
 const {data,error}=await db.from("image_galleries")
  .select("id,slug,title_te,title_en,description_te,cover_image_url,status,created_at")
  .in("slug",Array.from(new Set([slug,rawSlug,slug.replace(/\\+/g," ")])))
  .maybeSingle();
 if(error){console.error("Public gallery lookup failed", {slug,message:error.message,code:error.code});throw new Error("Unable to load gallery")}
 if(!data||data.status!=="published")notFound();
 const gallery=data as Gallery;
 const {data:images,error:imagesError}=await db.from("gallery_images")
  .select("id,image_url,alt_te,caption_te,sort_order")
  .eq("gallery_id",gallery.id).order("sort_order");
 if(imagesError){console.error("Public gallery photos lookup failed",{slug,message:imagesError.message,code:imagesError.code});throw new Error("Unable to load gallery photos")}
 return <><header className="top"><div className="wrap topin"><Link href="/" className="logo">Mee <b>Narada</b></Link><Link href="/?section=galleries">← Galleries</Link></div></header>
 <main className="detail"><div className="eyebrow">ఫోటో గ్యాలరీ</div><h1>{titleOf(gallery)}</h1><p>{gallery.description_te}</p>
 <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))"}}>{(images||[]).map(i=><figure key={i.id} style={{margin:0}}><img src={i.image_url} alt={i.alt_te||""} style={{width:"100%",borderRadius:12}}/><figcaption className="muted">{i.caption_te}</figcaption></figure>)}</div>
 </main></>;
}
