import type {Metadata} from "next";
import {db,titleOf} from "../../../lib/db";
const base="https://www.meenarada.com";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug:raw}=await params;let slug=raw;try{slug=decodeURIComponent(raw)}catch{}
 if(!db)return {title:"Photo Gallery | Mee Narada",robots:{index:false,follow:false}};
 const {data,error}=await db.from("image_galleries").select("slug,title_te,title_en,description_te,cover_image_url,status").eq("slug",slug).maybeSingle();
 if(error||!data||data.status!=="published")return {title:"Gallery Not Found | Mee Narada",robots:{index:false,follow:false}};
 const name=titleOf(data);
 const title=name+" Photos | Mee Narada";
 const description=(data.description_te||`Explore ${name} photo gallery, Telugu entertainment photos and exclusive images on Mee Narada.`).slice(0,170);
 const url=base+"/gallery/"+encodeURIComponent(data.slug);
 const images=data.cover_image_url?[{url:data.cover_image_url,alt:name}]:[];
 return {title,description,alternates:{canonical:url},openGraph:{type:"article",title,description,url,siteName:"Mee Narada",images},twitter:{card:images.length?"summary_large_image":"summary",title,description,images}};
}
export default function GalleryLayout({children}:{children:React.ReactNode}){return children}
