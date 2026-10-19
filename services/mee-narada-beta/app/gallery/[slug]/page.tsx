import Link from "next/link";
import {notFound} from "next/navigation";
import {db,titleOf,Gallery} from "../../../lib/db";
import PhotoViewer from "../../components/PhotoViewer";
import GalleryShare from "../../components/GalleryShare";
import {matchingProfile} from "../../../lib/profile-gallery";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug:raw}=await params;
 let slug=raw;try{slug=decodeURIComponent(raw)}catch{}
 if(!db){console.error("Public gallery: Supabase client is not configured");notFound()}
 const {data,error}=await db.from("image_galleries").select("id,slug,title_te,title_en,description_te,cover_image_url,status,created_at").in("slug",Array.from(new Set([slug,raw,slug.replace(/\+/g," ")]))).maybeSingle();
 if(error){console.error("Gallery lookup failed",error.message);throw new Error("Gallery could not be loaded")}
 if(!data||data.status!=="published")notFound();
 const gallery=data as Gallery;
 const {data:images,error:photosError}=await db.from("gallery_images").select("id,image_url,alt_te,caption_te,sort_order").eq("gallery_id",gallery.id).order("sort_order");
 if(photosError){console.error("Gallery photos failed",photosError.message);throw new Error("Gallery photos could not be loaded")}
 const photos=(images||[]) as {id:string;image_url:string;alt_te:string|null;caption_te:string|null}[];
 const galleryUrl="https://www.meenarada.com/gallery/"+encodeURIComponent(gallery.slug);
 const profile=await matchingProfile(gallery.category==="movie_posters"?"movies":"people",gallery);
 const jsonLd={"@context":"https://schema.org","@type":"ImageGallery",name:titleOf(gallery),description:gallery.description_te||titleOf(gallery),url:galleryUrl,mainEntityOfPage:galleryUrl,image:photos.map(p=>({"@type":"ImageObject",contentUrl:p.image_url,caption:p.caption_te||p.alt_te||titleOf(gallery)}))};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}}/><header className="top"><div className="wrap topin"><Link href="/" className="logo">Mee <b>Narada</b></Link><Link href="/gallery">← All Galleries</Link></div></header><main className="wrap gallery-detail"><div className="eyebrow">ఫోటో గ్యాలరీ</div><h1>{titleOf(gallery)}</h1>{gallery.description_te&&<p>{gallery.description_te}</p>}{profile&&<p className="gallery-profile-link"><Link href={(gallery.category==="movie_posters"?"/movie/":"/celebrity/")+encodeURIComponent(profile.slug)}>View {profile.name} {gallery.category==="movie_posters"?"movie":"profile"} →</Link></p>}<GalleryShare title={titleOf(gallery)} url={galleryUrl}/><div className="gallery-count">{photos.length} photos · Tap a photo to view full screen</div>{photos.length?<PhotoViewer photos={photos} title={titleOf(gallery)}/>:<p className="muted">No photos have been added yet.</p>}</main></>;
}
