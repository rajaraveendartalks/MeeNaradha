"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {db} from "../../lib/db";
type Video={id:string;slug:string;title_en:string|null;title_te:string|null;thumbnail_url:string|null;content_type:string|null};
export default function Videos(){
 const [items,setItems]=useState<Video[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;async function load(){
  if(!db){if(active){setError("Video service is not configured.");setLoading(false)}return}
  const result=await db.from("videos").select("id,slug,title_en,title_te,thumbnail_url,content_type").eq("status","published").order("created_at",{ascending:false}).limit(100);
  if(active){setItems(result.data||[]);setError(result.error?.message||"");setLoading(false)}
 }void load();return()=>{active=false}},[]);
 return <main style={{maxWidth:1050,margin:"40px auto",padding:20,fontFamily:"Arial,sans-serif"}}>
 <Link href="/">← Mee Narada</Link><h1>Videos · వీడియోలు</h1>
 {loading&&<p>Loading videos…</p>}{error&&<p role="alert">Unable to load videos: {error}</p>}
 {!loading&&!error&&items.length===0&&<p>No published videos available yet.</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:20}}>
 {items.map(v=><Link href={"/videos/"+encodeURIComponent(v.slug)} key={v.id} style={{color:"inherit",textDecoration:"none"}}>
 {v.thumbnail_url&&<img src={v.thumbnail_url} alt="" style={{width:"100%",borderRadius:10}}/>}
 <h2>{v.title_te||v.title_en}</h2><p>{v.content_type||"Video"}</p></Link>)}</div></main>
}