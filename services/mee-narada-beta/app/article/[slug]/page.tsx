import type {Metadata} from "next";
import Link from "next/link";import {ArticleContent} from "../../components/ArticleContent";import {notFound} from "next/navigation";import {db,titleOf,Article} from "../../../lib/db";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;
 if(!db)return {title:"Article Not Found | Mee Narada",robots:{index:false}};
 const {data}=await db.from("news_articles").select("slug,headline_te,headline_en,dek_te,dek_en,hero_image_url,status").eq("slug",slug).eq("status","published").maybeSingle();
 if(!data)return {title:"Article Not Found | Mee Narada",robots:{index:false}};
 const title=(data.headline_te||data.headline_en||"News")+" | Mee Narada";
 const description=(data.dek_te||data.dek_en||data.headline_te||data.headline_en||"Latest entertainment news").slice(0,160);
 const url="https://www.meenarada.com/article/"+encodeURIComponent(data.slug);
 const images=data.hero_image_url?[{url:data.hero_image_url,alt:data.headline_te||data.headline_en||"Mee Narada article"}]:[];
 return {title,description,alternates:{canonical:url},openGraph:{type:"article",title,description,url,siteName:"Mee Narada",images},twitter:{card:"summary_large_image",title,description,images:images.map(i=>i.url)}};
}

export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!db)notFound();const {data}=await db.from("news_articles").select("id,slug,headline_te,headline_en,dek_te,body_te,body_en,hero_image_url,category,status,published_at,created_at").eq("slug",slug).eq("status","published").maybeSingle();if(!data)notFound();const a=data as Article;return <><header className="top"><div className="wrap topin"><Link className="logo" href="/">Mee <b>Narada</b></Link><Link href="/">← వార్తలు</Link></div></header><article className="detail"><span className="pill">{a.category||"NEWS"}</span><h1>{titleOf(a)}</h1><p className="muted">{a.published_at?new Date(a.published_at).toLocaleDateString("en-IN"):""}</p>{a.hero_image_url&&<img className="hero" src={a.hero_image_url} alt=""/>}<ArticleContent value={a.body_te||a.body_en||a.dek_te||""}/><p><a href={"https://wa.me/?text="+encodeURIComponent(titleOf(a)+" "+(process.env.NEXT_PUBLIC_SITE_URL||"")+"/article/"+a.slug)} target="_blank" rel="noopener noreferrer">WhatsAppలో షేర్ చేయండి ↗</a></p></article></>}
