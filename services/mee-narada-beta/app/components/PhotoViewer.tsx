"use client";
import {useCallback,useEffect,useRef,useState} from "react";
type Photo={id:string;image_url:string;alt_te:string|null;caption_te:string|null};
export default function PhotoViewer({photos,title}:{photos:Photo[];title:string}){
 const [active,setActive]=useState<number|null>(null);
 const touch=useRef<number|null>(null);
 const close=useCallback(()=>setActive(null),[]);
 const step=useCallback((dir:number)=>setActive(i=>i===null?null:(i+dir+photos.length)%photos.length),[photos.length]);
 useEffect(()=>{if(active===null)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")close();if(e.key==="ArrowLeft")step(-1);if(e.key==="ArrowRight")step(1)};window.addEventListener("keydown",key);const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{window.removeEventListener("keydown",key);document.body.style.overflow=old}},[active,close,step]);
 return <><div className="photo-grid">{photos.map((p,i)=><button type="button" key={p.id} className="photo-tile" onClick={()=>setActive(i)} aria-label={`Open photo ${i+1} of ${photos.length}`}><img src={p.image_url} alt={p.alt_te||p.caption_te||title} loading="lazy"/><span className="photo-tile-caption">{p.caption_te||`Photo ${i+1}`}</span></button>)}</div>
 {active!==null&&photos[active]&&<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={title+" photo viewer"} onClick={close} onTouchStart={e=>{touch.current=e.touches[0]?.clientX??null}} onTouchEnd={e=>{if(touch.current===null)return;const diff=(e.changedTouches[0]?.clientX??touch.current)-touch.current;touch.current=null;if(Math.abs(diff)>55)step(diff<0?1:-1)}}>
 <div className="photo-lightbox-bar" onClick={e=>e.stopPropagation()}><span>{active+1} / {photos.length}</span><button type="button" onClick={close} aria-label="Close viewer">✕</button></div>
 <button type="button" className="photo-nav photo-prev" onClick={e=>{e.stopPropagation();step(-1)}} aria-label="Previous photo">‹</button>
 <figure className="photo-lightbox-figure" onClick={e=>e.stopPropagation()}><img src={photos[active].image_url} alt={photos[active].alt_te||photos[active].caption_te||title}/><figcaption>{photos[active].caption_te||title}</figcaption></figure>
 <button type="button" className="photo-nav photo-next" onClick={e=>{e.stopPropagation();step(1)}} aria-label="Next photo">›</button>
 </div>}</>;
}
