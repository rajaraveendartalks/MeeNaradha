"use client";
import { useMemo,useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type GalleryImage={id?:string;image_url:string;alt_en?:string|null;alt_te?:string|null;caption_en?:string|null;caption_te?:string|null;sort_order?:number|null;credit?:string|null};

export function GalleryUploader({galleryId,initialImages}:{galleryId:string;initialImages:GalleryImage[]}){
 const [images,setImages]=useState<GalleryImage[]>(initialImages);
 const [uploading,setUploading]=useState(false);
 const [error,setError]=useState("");
 const supabase=useMemo(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),[]);
 async function upload(files:FileList|null){
  if(!files?.length)return;setUploading(true);setError("");
  const added:GalleryImage[]=[];
  for(const file of Array.from(files)){
   const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";
   const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
   const path=`galleries/${galleryId}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
   const {error:uploadError}=await supabase.storage.from("media").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
   if(uploadError){setError(uploadError.message);continue}
   const {data}=supabase.storage.from("media").getPublicUrl(path);
   added.push({image_url:data.publicUrl,alt_en:"",alt_te:"",caption_en:"",caption_te:"",credit:"",sort_order:images.length+added.length});
  }
  if(added.length)setImages(v=>[...v,...added]);setUploading(false);
 }
 function remove(i:number){setImages(v=>v.filter((_,x)=>x!==i).map((img,x)=>({...img,sort_order:x})))}
 return <div className="cmsGalleryUploader">
  <label className="cmsUploadButton"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={e=>upload(e.target.files)} disabled={uploading}/>{uploading?"Uploading…":"Upload images"}</label>
  <span className="cmsUploadHint">Select multiple JPG, PNG, WebP or GIF files. Maximum 10 MB each.</span>
  {error&&<p className="cmsUploadError">{error}</p>}
  <div className="cmsGalleryCards">{images.map((img,i)=><div className="cmsGalleryCard" key={img.id||img.image_url}>
   <img src={img.image_url} alt={img.alt_en||"Gallery preview"}/>
   <input type="hidden" name={"gallery_image_"+i} value={img.image_url}/>
   <input name={"gallery_alt_en_"+i} defaultValue={img.alt_en??""} placeholder="Alt text (English)"/>
   <input name={"gallery_alt_te_"+i} defaultValue={img.alt_te??""} placeholder="Alt text (Telugu)"/>
   <input name={"gallery_caption_en_"+i} defaultValue={img.caption_en??""} placeholder="Caption (English)"/>
   <input name={"gallery_caption_te_"+i} defaultValue={img.caption_te??""} placeholder="Caption (Telugu)"/>
   <input name={"gallery_credit_"+i} defaultValue={img.credit??""} placeholder="Photo credit"/>
   <div className="cmsGalleryCardBottom"><input name={"gallery_order_"+i} type="number" min="0" defaultValue={img.sort_order??i} aria-label="Display order"/><button type="button" onClick={()=>remove(i)}>Remove</button></div>
  </div>)}</div>
  <input type="hidden" name="_gallery_rows" value={images.length}/>
 </div>
}