"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {errorMessage,listMedia,uploadMedia,type MediaItem} from "../../../lib/studio-data";
import {useStudio} from "./StudioShell";
import {StudioDialog} from "./StudioDialog";
import {ImageUploadControls} from './ImageUploadControls';
import {defaultImageOptions,imageSize,type ImageOptions} from '../../../lib/image-processing';

export function MediaLibrary({onSelect,showAlt=true}:{onSelect?:(item:MediaItem,alt:string)=>void;showAlt?:boolean}){
  const {client}=useStudio(),[folder,setFolder]=useState(""),[search,setSearch]=useState(""),[term,setTerm]=useState(""),[offset,setOffset]=useState(0),[items,setItems]=useState<MediaItem[]>([]);
  const [selected,setSelected]=useState<MediaItem|null>(null),[alt,setAlt]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[reload,setReload]=useState(0),[hasNext,setHasNext]=useState(false);
  const input=useRef<HTMLInputElement>(null),alive=useRef(true);
  const [pending,setPending]=useState<File[]>([]),[options,setOptions]=useState<ImageOptions>({...defaultImageOptions}),[results,setResults]=useState<string[]>([]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
  useEffect(()=>{const timeout=window.setTimeout(()=>{setTerm(search);setOffset(0)},250);return()=>window.clearTimeout(timeout)},[search]);
  useEffect(()=>{
    let active=true;setLoading(true);setError("");
    void listMedia(client,folder,term,offset).then(data=>{if(active){setItems(data);setHasNext(data.length===60)}}).catch(error=>{if(active){setItems([]);setError(errorMessage(error))}}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[client,folder,term,offset,reload]);
  const openFolder=useCallback((path:string)=>{setFolder(path);setOffset(0);setSearch("");setTerm("");setSelected(null);setError("");setMessage("")},[]);
  function choose(files:File[]){if(busy)return;setPending(files);setResults([]);setMessage('');setError('')}
  async function upload(files:File[]){
    if(!files.length||busy)return;setBusy(true);setError("");setMessage("");let count=0;
    const failed:File[]=[];setResults([]);
    try{for(let i=0;i<files.length;i++){if(!alive.current)break;setMessage("Processing and uploading "+(i+1)+" of "+files.length+"…");try{const item=await uploadMedia(client,files[i],folder,options);count++;if(alive.current){setSelected(item);setAlt('');setResults(previous=>[...previous,files[i].name+': '+imageSize(files[i].size)+' → '+imageSize(item.size)+' · '+item.note])}}catch(error){failed.push(files[i]);if(alive.current)setResults(previous=>[...previous,files[i].name+': '+errorMessage(error)])}}if(alive.current){setPending(failed);setMessage(count+' '+(count===1?'image':'images')+' uploaded.'+(failed.length?' '+failed.length+' need attention; retry uploads only these images.':''));if(failed.length)setError('Some images could not be uploaded. See the results below.')}}
    finally{if(alive.current){setBusy(false);setReload(value=>value+1);setOffset(0)}}
  }
  async function copyUrl(){if(!selected)return;try{await navigator.clipboard.writeText(selected.url);setMessage("Image URL copied.")}catch{setMessage("Select the image URL below to copy it.")}}
  return <div className="studio-media">
    <div className="studio-heading"><div><h1>{onSelect?"Choose an image":"Media Library"}</h1><p>Upload once. Reuse images in posts and galleries.</p></div><button type="button" className="studio-button studio-primary" disabled={busy} onClick={()=>input.current?.click()}>{busy?"Uploading…":"Upload files"}</button></div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={event=>{choose(Array.from(event.target.files||[]));event.target.value=""}}/>
    <ImageUploadControls files={pending} options={options} onChange={setOptions} disabled={busy}/>
    {pending.length>0&&<div className="studio-actions"><button type="button" className="studio-button studio-primary" disabled={busy} onClick={()=>void upload(pending)}>{busy?'Uploading…':'Upload '+pending.length+' selected images'}</button><button type="button" className="studio-button" disabled={busy} onClick={()=>setPending([])}>Clear selection</button></div>}
    {results.length>0&&<details open className="studio-upload-results"><summary>Upload results</summary><ul>{results.map((result,index)=><li key={index}>{result}</li>)}</ul></details>}
    <div className="studio-toolbar"><nav className="studio-breadcrumbs" aria-label="Media folders"><button type="button" onClick={()=>openFolder("")} className="studio-link">Media</button>{folder.split("/").filter(Boolean).map((part,index,parts)=><span key={index}> / <button type="button" className="studio-link" onClick={()=>openFolder(parts.slice(0,index+1).join("/"))}>{part}</button></span>)}</nav><input type="search" aria-label="Search this media folder" placeholder="Search this folder…" value={search} onChange={event=>setSearch(event.target.value)}/></div>
    {error&&<p className="studio-message studio-error" role="alert">{error}</p>}{message&&<p className="studio-message" role="status">{message}</p>}
    <div className="studio-media-layout"><div>
      <div className="studio-upload-zone" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();choose(Array.from(event.dataTransfer.files))}}><span>Drop images here or <button type="button" className="studio-link" onClick={()=>input.current?.click()} disabled={busy}>choose files</button></span><small>JPG, PNG, WebP or GIF · originals up to 40 MB · uploaded files up to 8 MB</small></div>
      {loading?<p role="status">Loading images…</p>:<div className="studio-media-grid">{items.map(item=>item.folder?<button type="button" key={item.path} className="studio-media-card studio-folder" onClick={()=>openFolder(item.path)}><span aria-hidden="true">▱</span><strong>{item.name}</strong><small>Open folder</small></button>:<button type="button" key={item.path} className="studio-media-card" aria-pressed={selected?.path===item.path} onClick={()=>{setSelected(item);setAlt("");setMessage("")}}><img src={item.url} alt="" loading="lazy"/><span>{item.name.replace(/^[a-f0-9-]{36}-/i,"")}</span></button>)}</div>}
      {!loading&&!items.length&&!error&&<p className="studio-empty">{term?"No images match this search.":"No images in this folder yet. Upload an image to get started."}</p>}
      <div className="studio-pagination"><button type="button" className="studio-button" disabled={!offset||loading} onClick={()=>setOffset(value=>Math.max(0,value-60))}>Previous</button><span>Page {Math.floor(offset/60)+1}</span><button type="button" className="studio-button" disabled={!hasNext||loading} onClick={()=>setOffset(value=>value+60)}>Next</button></div>
    </div><aside className="studio-media-details">{selected?<><h2>Image details</h2><img src={selected.url} alt="" className="studio-media-large"/><p className="studio-filename">{selected.name}</p><p>{(selected.size/1024).toFixed(0)} KB</p><label className="studio-field"><span>Image URL</span><input value={selected.url} readOnly onFocus={event=>event.target.select()}/></label><button type="button" className="studio-button" onClick={()=>void copyUrl()}>Copy URL</button>{onSelect&&<>{showAlt&&<label className="studio-field"><span>Alt text for this insertion</span><input value={alt} onChange={event=>setAlt(event.target.value)} placeholder="Describe the image for readers"/></label>}<button type="button" className="studio-button studio-primary" disabled={busy} onClick={()=>onSelect(selected,alt)}>Use this image</button></>}</>:<p>Select an image to see its details.</p>}</aside></div>
  </div>;
}
export function MediaPicker({onClose,onSelect,showAlt=true}:{onClose:()=>void;onSelect:(item:MediaItem,alt:string)=>void;showAlt?:boolean}){return <StudioDialog title="Media Library" onClose={onClose}><MediaLibrary onSelect={onSelect} showAlt={showAlt}/></StudioDialog>}
