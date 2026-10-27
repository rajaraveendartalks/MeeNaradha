import Link from "next/link";
import {redirect} from "next/navigation";
import {db,titleOf,type Article,type Gallery} from "../lib/db";
import {type VideoSummary} from "../lib/video";
import {PublicHeader,PublicFooter} from "./components/PublicChrome";
import {VideoCard} from "./components/VideoCard";
export const dynamic="force-dynamic";
const sections=[{key:"latest",label:"తాజా అప్‌డేట్స్"},{key:"movies",label:"సినిమా వార్తలు"},{key:"ott",label:"OTT అప్‌డేట్స్"},{key:"celebrities",label:"సెలబ్రిటీలు"},{key:"box-office",label:"బాక్సాఫీస్"}];
export default async function Home({searchParams}:{searchParams:Promise<{section?:string}>}){
 const {section="latest"}=await searchParams;
 if(section==="galleries")redirect("/gallery");
 if(section==="short-films")redirect("/videos?category=short_film");
 const selected=sections.some(item=>item.key===section)?section:"latest";
 const [newsResult,galleryResult,videoResult]=await Promise.all([
  db?db.from("news_articles").select("id,slug,headline_te,headline_en,dek_te,hero_image_url,category,status,published_at,created_at").eq("status","published").order("published_at",{ascending:false,nullsFirst:false}).limit(180):Promise.resolve({data:null,error:null}),
  db?db.from("image_galleries").select("id,slug,title_te,title_en,description_te,cover_image_url,status,created_at").eq("status","published").order("created_at",{ascending:false}).limit(6):Promise.resolve({data:null,error:null}),
  db?db.from("videos").select("id,slug,title_te,title_en,thumbnail_url,content_type").eq("status","published").order("created_at",{ascending:false}).limit(30):Promise.resolve({data:null,error:null}),
 ]);
 const news=(newsResult.data||[]) as Article[],galleries=(galleryResult.data||[]) as Gallery[],videos=(videoResult.data||[]) as VideoSummary[];
 const filtered=news.filter(article=>selected==="latest"||(article.category||"").toLowerCase().includes(selected==="movies"?"movie":selected));
 const shelves=[{type:"trailer",title:"ట్రైలర్లు & టీజర్లు",en:"TRAILERS & TEASERS"},{type:"song",title:"సినిమా పాటలు",en:"MUSIC ROOM"},{type:"short_film",title:"కొత్త కథలు. కొత్త ప్రతిభ.",en:"SHORT FILMS"}];
 return <><PublicHeader active={selected==="latest"?"home":"news"}/><main id="main-content" className="mn-container mn-home">
  <div className="mn-home-intro"><div><p className="mn-eyebrow">CINEMA. MUSIC. STORIES.</p><h1>{selected==="latest"?<>తెలుగు వినోదం.<span> ఒకే చోట!</span></>:sections.find(item=>item.key===selected)?.label}</h1></div><p>తాజా సినిమా విశేషాలు, ట్రైలర్లు,<br/>పాటలు, కొత్త కథలు — ఒకేచోట.</p></div>
  <nav className="mn-topics" aria-label="News categories">{sections.map(item=><Link className={selected===item.key?"is-current":""} key={item.key} href={item.key==="latest"?"/":"/?section="+item.key} aria-current={selected===item.key?"page":undefined}>{item.label}</Link>)}</nav>
  {selected==="latest"&&videos.length>0&&<section className="mn-feature-section" aria-label="Featured and latest videos"><div className="mn-feature-lead"><VideoCard video={videos[0]} variant="feature" priority/></div><aside className="mn-latest-rail"><div className="mn-rail-heading"><h2>తాజా వీడియోలు</h2><Link href="/videos" aria-label="View all videos">అన్నీ ↗</Link></div>{videos.slice(1,5).map(video=><VideoCard key={video.id} video={video} variant="compact"/>)}</aside></section>}
  <section className="mn-section"><div className="mn-section-heading"><div><p className="mn-eyebrow">THE LATEST</p><h2>{selected==="latest"?"సినిమా విశేషాలు":sections.find(item=>item.key===selected)?.label}</h2></div><Link href={selected==="latest"?"/?section=movies":"/"}>{selected==="latest"?"సినిమా వార్తలు ↗":"అన్ని అప్‌డేట్స్ ↗"}</Link></div>
   {filtered.length>0?<div className="mn-news-grid">{filtered.slice(0,selected==="latest"?6:180).map(article=><Link key={article.id} className="mn-news-card" href={"/article/"+encodeURIComponent(article.slug)}><div className="mn-news-image">{article.hero_image_url?<img src={article.hero_image_url} alt="" loading="lazy"/>:<span className="mn-image-empty">Mee Narada</span>}</div><div><span className="mn-category">{article.category||"Cinema"}</span><h3>{titleOf(article)}</h3>{article.dek_te&&<p>{article.dek_te}</p>}</div></Link>)}</div>:<div className="mn-empty">{newsResult.error?"వార్తలను ప్రస్తుతం లోడ్ చేయలేకపోయాము. దయచేసి కాసేపటి తర్వాత ప్రయత్నించండి.":"ఈ విభాగంలో కొత్త కథనాలు త్వరలో. ఈలోగా తాజా వీడియోలను చూడండి."}<Link href="/videos">వీడియోలు చూడండి ↗</Link></div>}
  </section>
  {selected==="latest"&&<>{shelves.map(shelf=>{const items=videos.filter(video=>video.content_type===shelf.type).slice(0,4);return items.length>0?<section className="mn-section" key={shelf.type}><div className="mn-section-heading"><div><p className="mn-eyebrow">{shelf.en}</p><h2>{shelf.title}</h2></div><Link href={"/videos?category="+shelf.type}>అన్నీ చూడండి ↗</Link></div><div className="mn-video-grid">{items.map(video=><VideoCard key={video.id} video={video}/>)}</div></section>:null})}
   {videoResult.error&&<p className="mn-notice" role="status">వీడియోలను ప్రస్తుతం లోడ్ చేయలేకపోయాము. <Link href="/videos">మళ్లీ ప్రయత్నించండి</Link></p>}
   {galleries.length>0&&<section className="mn-section"><div className="mn-section-heading"><div><p className="mn-eyebrow">IN THE FRAME</p><h2>ఫోటో గ్యాలరీలు</h2></div><Link href="/gallery">అన్నీ చూడండి ↗</Link></div><div className="mn-gallery-grid">{galleries.slice(0,4).map(gallery=><Link key={gallery.id} href={"/gallery/"+encodeURIComponent(gallery.slug)} className="mn-gallery-card"><div>{gallery.cover_image_url?<img src={gallery.cover_image_url} alt="" loading="lazy"/>:<span className="mn-image-empty">Mee Narada</span>}</div><h3>{titleOf(gallery)}</h3></Link>)}</div></section>}
   <section className="mn-creator-banner"><div><p className="mn-eyebrow">YOUR STORY STARTS HERE</p><h2>మీ కథను ప్రపంచానికి పరిచయం చేయండి.</h2><p>మీ ట్రైలర్, పాట లేదా షార్ట్ ఫిల్మ్‌ను సమీక్ష కోసం పంపండి.</p></div><Link href="/creator-studio" className="mn-primary-button">Open Creator Studio ↗</Link></section>
  </>}
 </main><PublicFooter/></>;
}
