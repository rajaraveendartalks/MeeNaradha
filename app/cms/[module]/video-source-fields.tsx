"use client";
import {useMemo,useState} from "react";

function youtubeId(value:string){
 const v=value.trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
 try{
  const u=new URL(v);
  if(u.hostname==="youtu.be") return u.pathname.split("/").filter(Boolean)[0]||"";
  if(u.hostname.includes("youtube.com")){
   if(u.pathname==="/watch") return u.searchParams.get("v")||"";
   const parts=u.pathname.split("/").filter(Boolean);
   if(["shorts","embed","live"].includes(parts[0])) return parts[1]||"";
  }
 }catch{}
 return "";
}
export function VideoSourceFields({videoUrl="",externalId="",thumbnailUrl=""}:{videoUrl?:string;externalId?:string;thumbnailUrl?:string}){
 const [url,setUrl]=useState(videoUrl); const [manualId,setManualId]=useState(externalId); const [customThumb,setCustomThumb]=useState(thumbnailUrl);
 const detected=useMemo(()=>youtubeId(url),[url]); const id=detected||manualId.trim();
 const autoThumb=id?`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`:"";
 const thumb=customThumb.trim()||autoThumb;
 return <div className="cmsVideoSource wide">
  <label><span>Video URL (YouTube / Instagram / Facebook / X / hosted video)</span><input name="video_url" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a YouTube URL to auto-detect its thumbnail"/></label>
  <label><span>External ID / YouTube video ID</span><input name="external_id" value={id} onChange={e=>setManualId(e.target.value)} readOnly={Boolean(detected)} placeholder="Auto-detected from YouTube URL"/></label>
  <label><span>Custom Thumbnail URL (optional override)</span><input value={customThumb} onChange={e=>setCustomThumb(e.target.value)} type="url" placeholder="Leave blank to use the YouTube thumbnail"/></label>
  <input type="hidden" name="thumbnail_url" value={thumb}/>
  {thumb&&<div className="cmsVideoPreview"><img src={thumb} alt="Video thumbnail preview"/><div><b>{customThumb?"Custom thumbnail":"YouTube thumbnail detected"}</b><small>{detected?"Video ID: "+detected:"Thumbnail preview"}</small></div></div>}
 </div>;
}
