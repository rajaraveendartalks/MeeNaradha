"use client";
import {useMemo,useState} from "react";
function youtubeId(value:string){try{const u=new URL(value.trim());if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";if(u.hostname.includes("youtube.com")){if(u.pathname==="/watch")return u.searchParams.get("v")||"";const p=u.pathname.split("/").filter(Boolean);if(["shorts","embed","live"].includes(p[0]))return p[1]||""}}catch{}return ""}
export function ShortFilmMediaFields({posterUrl=""}:{posterUrl?:string}){
 const [videoUrl,setVideoUrl]=useState(""); const [customPoster,setCustomPoster]=useState(posterUrl);
 const id=useMemo(()=>youtubeId(videoUrl),[videoUrl]); const auto=id?`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`:""; const poster=customPoster.trim()||auto;
 return <div className="cmsVideoSource wide">
  <label><span>YouTube / Video URL</span><input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="Paste YouTube URL to detect the poster"/></label>
  <label><span>Custom Poster URL (optional override)</span><input value={customPoster} onChange={e=>setCustomPoster(e.target.value)} type="url" placeholder="Leave blank to use YouTube thumbnail"/></label>
  <input type="hidden" name="poster_url" value={poster}/>
  {poster&&<div className="cmsVideoPreview"><img src={poster} alt="Short film poster preview"/><div><b>{customPoster?"Custom poster":"YouTube poster detected"}</b>{id&&<small>Video ID: {id}</small>}<small>V1 stores the poster; the watch URL will be linked through the Videos module until the Short Films schema gets a dedicated source field.</small></div></div>}
 </div>
}