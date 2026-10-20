import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {db} from "../../../lib/db";
import {relatedGalleries} from "../../../lib/profile-gallery";
export const dynamic="force-dynamic";
type Props={params:Promise<{slug:string}>};
async function getProfile(raw:string){
 if(!db){console.error("Celebrity profile: Supabase client is not configured");return null}
 let slug=raw;try{slug=decodeURIComponent(raw)}catch{}
 const {data,error}=await db.from("people").select("id,slug,name_en,name_te,bio_en,bio_te,primary_profession,profile_image_url,status").ilike("slug",slug).eq("status","published").limit(1).maybeSingle();
 if(error){console.error("Celebrity profile lookup failed",error.code,error.message);throw new Error("Celebrity profile could not be loaded")}
 if(!data)console.warn("Celebrity profile not found for published slug",slug);
 return data;
}
export async function generateMetadata({params}:Props):Promise<Metadata>{const p=await getProfile((await params).slug);if(!p)return {title:"Celebrity Not Found | Mee Narada",robots:{index:false}};const name=p.name_te||p.name_en||p.slug;const title=name+" — Celebrity Profile & Photos | Mee Narada";const description=(p.bio_te||p.bio_en||"Biography, photos and galleries of "+name).slice(0,170);const url="https://www.meenarada.com/celebrity/"+encodeURIComponent(p.slug);return {title,description,alternates:{canonical:url},openGraph:{title,description,url,images:p.profile_image_url?[p.profile_image_url]:[]}}}
export default async function Celebrity({params}:Props){const p=await getProfile((await params).slug);if(!p)notFound();const name=p.name_te||p.name_en||p.slug;const galleries=await relatedGalleries(p.slug,[p.name_en,p.name_te],["actors","actresses","influencers"]);return <><header className="top"><div className="wrap topin"><Link className="logo" href="/">Mee <b>Narada</b></Link><nav className="nav"><Link href="/gallery">Photo Galleries</Link></nav></div></header><main className="wrap profile-page"><Link href="/gallery" className="muted">← Galleries</Link><div className="profile-hero">{p.profile_image_url&&<img src={p.profile_image_url} alt={name}/>}<div><span className="eyebrow">CELEBRITY PROFILE</span><h1>{name}</h1><p className="muted">{p.primary_profession||"Entertainment"}</p><p>{p.bio_te||p.bio_en||""}</p></div></div><section className="section-block"><div className="section-title"><h2>Photo Galleries</h2><Link href="/gallery">All galleries →</Link></div>{galleries.length?<div className="profile-gallery-grid">{galleries.map(g=><Link className="profile-gallery-card" href={"/gallery/"+encodeURIComponent(g.slug)} key={g.id}>{g.cover_image_url&&<img src={g.cover_image_url} alt={g.title_te||g.title_en||name}/>}<strong>{g.title_te||g.title_en||name}</strong></Link>)}</div>:<p className="muted">No linked published photo galleries yet.</p>}</section></main></>}
