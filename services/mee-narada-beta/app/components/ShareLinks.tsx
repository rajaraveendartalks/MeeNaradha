"use client";
import {useState} from "react";
export default function ShareLinks({title,url,kind}:{title:string;url:string;kind:"article"|"gallery"}){
 const [copied,setCopied]=useState(false);
 const [instagramStatus,setInstagramStatus]=useState<"copied"|"manual"|null>(null);
 const message=`${title} – Mee Narada\n${url}`;
 const whatsApp="https://wa.me/?text="+encodeURIComponent(message);
 const facebook="https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(url);
 const x="https://twitter.com/intent/tweet?text="+encodeURIComponent(title+" – Mee Narada")+"&url="+encodeURIComponent(url);
 async function share(){
  if(typeof navigator!=="undefined"&&navigator.share){try{await navigator.share({title,text:title+" – Mee Narada",url});return}catch(e){if((e as Error).name==="AbortError")return}}
  await copy();
 }
 async function copy(){try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2200)}catch{window.prompt("Copy gallery link:",url)}}
 async function copyForInstagram(){
  try{
   await navigator.clipboard.writeText(url);
   setInstagramStatus("copied");
  }catch{
   setInstagramStatus("manual");
  }
 }
 return (
  <div className="gallery-share" role="group" aria-label={`Share this ${kind}`}>
   <strong>Share {kind}</strong>
   {kind==="gallery"&&<button type="button" onClick={share}>Share ↗</button>}
   <a href={whatsApp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
   <a href={facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
   <a href={x} target="_blank" rel="noopener noreferrer">X</a>
   {kind==="gallery"
    ? <button type="button" onClick={copy}>{copied?"Copied ✓":"Copy link"}</button>
    : <button type="button" onClick={copyForInstagram}>Instagram · Copy link</button>}
   {instagramStatus&&(
    <div style={{flexBasis:"100%"}}>
     <p role="status">
      {instagramStatus==="copied"?"Link copied.":"Copy the article link below."} Paste it into an Instagram message or a Story link sticker.
     </p>
     {instagramStatus==="manual"&&(
      <input aria-label="Article link" readOnly value={url} onFocus={event=>event.currentTarget.select()}/>
     )}
    </div>
   )}
  </div>
 );
}
