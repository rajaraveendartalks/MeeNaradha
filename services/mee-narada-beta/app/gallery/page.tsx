import type {Metadata} from "next";
import Link from "next/link";
import {db,titleOf,Gallery} from "../../lib/db";
export const dynamic="force-dynamic";
const filters=[{key:"all",name:"All Galleries",te:"అన్ని ఫోటోలు"},{key:"movie_posters",name:"Movie Posters",te:"సినిమా పోస్టర్లు"},{key:"actors",name:"Actors",te:"నటులు"},{key:"actresses",name:"Actresses",te:"నటీమణులు"},{key:"influencers",name:"Influencers",te:"ఇన్‌ఫ్లుయెన్సర్లు"}];
type ListedGallery=Gallery&{category?:string|null};
export async function generateMetadata({searchParams}:{searchParams:Promise<{category?:string}>}):Promise<Metadata>{
 const {category="all"}=await searchParams;const selected=filters.find(f=>f.key===category)||filters[0];const title=selected.key==="all"?"Photo Galleries | Mee Narada":selected.name+" Photo Galleries | Mee Narada";const description="Explore Telugu movie posters, actors, actresses and influencer photo galleries on Mee Narada.";const url="https://www.meenarada.com/gallery"+(selected.key==="all"?"":"?category="+selected.key);return {title,description,alternates:{canonical:url},openGraph:{type:"website",title,description,url,siteName:"Mee Narada"},twitter:{card:"summary",title,description}};
}
export default async function GalleryHome({searchParams}:{searchParams:Promise<{category?:string}>}){
 const {category="all"}=await searchParams;
 const selected=filters.some(f=>f.key===category)?category:"all";
 if(!db)return <main className="wrap"><p className="notice">Gallery service is unavailable.</p></main>;
 let query=db.from("image_galleries").select("id,slug,title_te,title_en,description_te,cover_image_url,status,category,created_at").eq("status","published").order("created_at",{ascending:false}).limit(120);
 if(selected!=="all")query=query.eq("category",selected);
 const {data,error}=await query;
 if(error)console.error("Public gallery index error",error.message);
 const galleries=(data||[]) as ListedGallery[];
 return <><header className="top"><div className="wrap topin"><Link href="/" className="logo">Mee <b>Narada</b></Link><nav className="nav"><Link href="/">← Home</Link><Link href="/admin/galleries">CMS</Link></nav></div></header>
 <main className="wrap gallery-home"><div className="eyebrow">MEE NARADA · PHOTO STORIES</div><h1>ఫోటో గ్యాలరీలు <span>Photo Galleries</span></h1><p className="gallery-home-intro">తెలుగు సినిమా పోస్టర్లు, నటీనటులు మరియు ఇన్‌ఫ్లుయెన్సర్ల ఫోటోలు ఒకే చోట.</p>
 <nav className="gallery-filters" aria-label="Gallery categories">{filters.map(f=><Link key={f.key} className={selected===f.key?"active":""} href={f.key==="all"?"/gallery":"/gallery?category="+f.key}><span>{f.te}</span><small>{f.name}</small></Link>)}</nav>
 {error?<p className="notice">Unable to load galleries. Please try again later.</p>:galleries.length?<><div className="gallery-result-count">{galleries.length} {galleries.length===1?"gallery":"galleries"}</div><div className="gallery-cards">{galleries.map(g=><Link key={g.id} href={"/gallery/"+encodeURIComponent(g.slug)} className="gallery-card"><div className="gallery-card-image">{g.cover_image_url?<img src={g.cover_image_url} alt={titleOf(g)} loading="lazy"/>:<div className="gallery-card-placeholder">Mee Narada</div>}</div><div className="gallery-card-copy"><span>{filters.find(f=>f.key===g.category)?.name||"Gallery"}</span><h2>{titleOf(g)}</h2><span className="gallery-card-link">View photos →</span></div></Link>)}</div></>:<div className="gallery-empty"><h2>ఇంకా గ్యాలరీలు లేవు</h2><p>No published galleries in this category yet.</p><Link href="/gallery">View all galleries →</Link></div>}
 </main><footer className="footer"><div className="wrap footer-inner">© Mee Narada · Telugu Entertainment</div></footer></>;
}
