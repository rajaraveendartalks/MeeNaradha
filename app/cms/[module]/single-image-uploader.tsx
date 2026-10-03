"use client";
import { useMemo,useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function SingleImageUploader({name,initialUrl,label="Upload poster / hero image"}:{name:string;initialUrl?:string;label?:string}){
 const [url,setUrl]=useState(initialUrl||""); const [uploading,setUploading]=useState(false); const [error,setError]=useState("");
 const supabase=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),[]);
 async function upload(file?:File){if(!file)return;setUploading(true);setError("");const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");const path=`editorial/${Date.now()}-${crypto.randomUUID()}-${safe}`;const {error:e}=await supabase.storage.from("media").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(e){setError(e.message);setUploading(false);return}const {data}=supabase.storage.from("media").getPublicUrl(path);setUrl(data.publicUrl);setUploading(false)}
 return <div className="cmsRelation"><label className="cmsUploadButton"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>upload(e.target.files?.[0])} disabled={uploading}/>{uploading?"Uploading…":label}</label>{url&&<div className="cmsGalleryCard"><img src={url} alt="Poster preview"/><button type="button" onClick={()=>setUrl("")}>Remove</button></div>}{error&&<p className="cmsUploadError">{error}</p>}<input type="hidden" name={name} value={url}/></div>
}