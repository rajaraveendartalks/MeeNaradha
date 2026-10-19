"use client";
import {useState} from "react";
export default function GalleryShare({title,url}:{title:string;url:string}){
 const [copied,setCopied]=useState(false);
 const message=`${title} – Mee Narada\n${url}`;
 const whatsApp="https://wa.me/?text="+encodeURIComponent(message);
 const facebook="https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(url);
 const x="https://twitter.com/intent/tweet?text="+encodeURIComponent(title+" – Mee Narada")+"&url="+encodeURIComponent(url);
 async function share(){
  if(typeof navigator!=="undefined"&&navigator.share){try{await navigator.share({title,text:title+" – Mee Narada",url});return}catch(e){if((e as Error).name==="AbortError")return}}
  await copy();
 }
 async function copy(){try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2200)}catch{window.prompt("Copy gallery link:",url)}}
 return <div className="gallery-share" aria-label="Share this gallery"><strong>Share gallery</strong><button type="button" onClick={share}>Share ↗</button><a href={whatsApp} target="_blank" rel="noopener noreferrer">WhatsApp</a><a href={facebook} target="_blank" rel="noopener noreferrer">Facebook</a><a href={x} target="_blank" rel="noopener noreferrer">X</a><button type="button" onClick={copy}>{copied?"Copied ✓":"Copy link"}</button></div>;
}
