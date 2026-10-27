"use client";
import {useEffect,useState} from "react";
import {db} from "../../lib/db";
import {type VideoSummary} from "../../lib/video";
import {PublicHeader,PublicFooter} from "../components/PublicChrome";
import {VideoCard} from "../components/VideoCard";
const filters=[{value:"all",label:"All"},{value:"trailer",label:"Trailers"},{value:"song",label:"Songs"},{value:"short_film",label:"Short Films"}] as const;
type Filter=typeof filters[number]["value"];
export default function Videos(){
 const [items,setItems]=useState<VideoSummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[selected,setSelected]=useState<Filter>("all");
 useEffect(()=>{const readFilter=()=>{const value=new URLSearchParams(window.location.search).get("category");setSelected(filters.some(filter=>filter.value===value)?value as Filter:"all")};readFilter();window.addEventListener("popstate",readFilter);return()=>window.removeEventListener("popstate",readFilter)},[]);
 useEffect(()=>{let active=true;async function load(){
  if(!db){if(active){setError("Video service is not configured.");setLoading(false)}return}
  try{const result=await db.from("videos").select("id,slug,title_en,title_te,thumbnail_url,content_type").eq("status","published").order("created_at",{ascending:false}).limit(100);if(active){setItems(result.data||[]);setError(result.error?.message||"")}}
  catch{if(active)setError("Please check your connection and try again.")}finally{if(active)setLoading(false)}
 }void load();return()=>{active=false}},[]);
 function choose(value:Filter){if(value===selected)return;setSelected(value);const url=new URL(window.location.href);if(value==="all")url.searchParams.delete("category");else url.searchParams.set("category",value);window.history.pushState(null,"",url)}
 const visible=selected==="all"?items:items.filter(video=>video.content_type===selected),selectedLabel=filters.find(filter=>filter.value===selected)!.label;
 return <><PublicHeader active="videos"/><main id="main-content" className="mn-container mn-library"><div className="mn-page-heading"><p className="mn-eyebrow">THE SCREEN ROOM</p><h1>వీడియోలు <span>Videos</span></h1><p>ట్రైలర్లు, పాటలు, షార్ట్ ఫిల్మ్స్ — మీకు నచ్చినవి ఎంచుకోండి.</p></div>
  <div role="group" aria-label="Filter videos" className="mn-filter-bar">{filters.map(filter=><button key={filter.value} type="button" aria-pressed={selected===filter.value} aria-controls="video-results" onClick={()=>choose(filter.value)}>{filter.label}{!loading&&!error&&<span> {filter.value==="all"?items.length:items.filter(video=>video.content_type===filter.value).length}</span>}</button>)}</div>
  {loading&&<p className="mn-notice" role="status">Loading videos…</p>}{error&&<p className="mn-notice" role="alert">Unable to load videos: {error}</p>}
  <section id="video-results" aria-label={selectedLabel+" videos"} aria-busy={loading}><h2 className="mn-sr-only">Published videos</h2>
   {!loading&&!error&&<p role="status" aria-live="polite" className="mn-results">{visible.length?`${visible.length} ${visible.length===1?"video":"videos"} · ${selectedLabel}`:selected==="all"?"No published videos available yet.":`No ${selectedLabel.toLowerCase()} available yet. Choose All to browse other videos.`}</p>}
   <div className="mn-video-grid">{visible.map(video=><VideoCard key={video.id} video={video}/>)}</div>
  </section>
 </main><PublicFooter/></>;
}
