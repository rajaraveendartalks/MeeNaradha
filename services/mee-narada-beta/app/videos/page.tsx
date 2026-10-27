"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {db} from "../../lib/db";
type Video={id:string;slug:string;title_en:string|null;title_te:string|null;thumbnail_url:string|null;content_type:string|null};
const filters=[
 {value:"all",label:"All"},
 {value:"trailer",label:"Trailers"},
 {value:"song",label:"Songs"},
 {value:"short_film",label:"Short Films"},
] as const;
type Filter=typeof filters[number]["value"];
const categoryLabels:Record<string,string>={trailer:"Trailer · ట్రైలర్",song:"Song · పాట",short_film:"Short Film · షార్ట్ ఫిల్మ్",reel:"Reel · రీల్"};
export default function Videos(){
 const [items,setItems]=useState<Video[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<Filter>("all");
 useEffect(()=>{let active=true;async function load(){
  if(!db){if(active){setError("Video service is not configured.");setLoading(false)}return}
  try{
   const result=await db.from("videos").select("id,slug,title_en,title_te,thumbnail_url,content_type").eq("status","published").order("created_at",{ascending:false}).limit(100);
   if(active){setItems(result.data||[]);setError(result.error?.message||"")}
  }catch{if(active)setError("Please check your connection and try again.")}
  finally{if(active)setLoading(false)}
 }void load();return()=>{active=false}},[]);
 const visible=selected==="all"?items:items.filter(video=>video.content_type===selected);
 const selectedLabel=filters.find(filter=>filter.value===selected)!.label;
 return <main style={{maxWidth:1050,margin:"40px auto",padding:20,fontFamily:"Arial,sans-serif"}}>
  <Link href="/">← Mee Narada</Link><h1>Videos · వీడియోలు</h1>
  <div role="group" aria-label="Filter videos" style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:24}}>
   {filters.map(filter=><button key={filter.value} type="button" aria-pressed={selected===filter.value} aria-controls="video-results" onClick={()=>setSelected(filter.value)} style={{padding:"10px 16px",minHeight:44,borderRadius:24,border:"1px solid #d71939",background:selected===filter.value?"#d71939":"#fff",color:selected===filter.value?"#fff":"#8f1027",fontWeight:600,cursor:"pointer"}}>
    {filter.label}{!loading&&!error&&` (${filter.value==="all"?items.length:items.filter(video=>video.content_type===filter.value).length})`}
   </button>)}
  </div>
  {loading&&<p role="status">Loading videos…</p>}{error&&<p role="alert">Unable to load videos: {error}</p>}
  <section id="video-results" aria-label={selectedLabel+" videos"} aria-busy={loading}>
   {!loading&&!error&&<p role="status" aria-live="polite" style={{color:"#555",fontSize:14}}>{visible.length?`${visible.length} ${visible.length===1?"video":"videos"} · ${selectedLabel}`:selected==="all"?"No published videos available yet.":`No ${selectedLabel.toLowerCase()} available yet. Choose All to browse other videos.`}</p>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(240px,100%),1fr))",gap:20}}>
    {visible.map(video=><Link href={"/videos/"+encodeURIComponent(video.slug)} key={video.id} style={{color:"inherit",textDecoration:"none",minWidth:0}}>
     {video.thumbnail_url&&<img src={video.thumbnail_url} alt="" style={{width:"100%",borderRadius:10}}/>}
     <h2>{video.title_te||video.title_en}</h2><p>{categoryLabels[video.content_type||""]||"Video · వీడియో"}</p>
    </Link>)}
   </div>
  </section>
 </main>;
}
