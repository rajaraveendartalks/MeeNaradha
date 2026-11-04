import Link from "next/link";
import {Suspense} from "react";
import HomeVideos from "./components/HomeVideos";
import {CategoryNews,type NewsLayout} from "./components/CategoryNews";
import {db,configured,titleOf,Article,Gallery} from "../lib/db";
export const dynamic="force-dynamic";
const categories=[{key:"latest",label:"అన్ని వార్తలు"},{key:"movies",label:"సినిమాలు"},{key:"ott",label:"OTT"},{key:"celebrities",label:"సెలబ్రిటీలు"},{key:"box-office",label:"బాక్సాఫీస్"},{key:"technology",label:"టెక్నాలజీ"},{key:"politics",label:"రాజకీయాలు"},{key:"short-films",label:"షార్ట్ ఫిల్మ్స్"},{key:"galleries",label:"ఫోటోలు"}];
function card(a:Article,variant=""){return <Link className={"news-card "+variant} key={a.id} href={"/article/"+encodeURIComponent(a.slug)}><div className="news-image">{a.hero_image_url?<img src={a.hero_image_url} alt={titleOf(a)} loading={variant==="lead"?"eager":"lazy"}/>:<div className="image-empty">Mee Narada</div>}{a.headline_en?.startsWith("[DEMO]")&&<span className="demo-tag">DEMO</span>}</div><div className="news-copy"><span className="category-label">{a.category||"NEWS"}</span><h2>{titleOf(a)}</h2>{variant!=="compact"&&<p>{a.dek_te||a.headline_en||""}</p>}</div></Link>}
const newsCategories:{key:string;label:string;layout:NewsLayout;match:(category:string)=>boolean}[]=[
 {key:"movies",label:"సినిమా వార్తలు",layout:"lead-grid",match:s=>/movie|cinema|film/i.test(s)},
 {key:"ott",label:"OTT అప్‌డేట్స్",layout:"split",match:s=>/ott/i.test(s)},
 {key:"celebrities",label:"సెలబ్రిటీ వార్తలు",layout:"lead-grid",match:s=>/celebrit|actor|star/i.test(s)},
 {key:"box-office",label:"బాక్సాఫీస్",layout:"compact",match:s=>/box[ _-]?office/i.test(s)},
 {key:"technology",label:"టెక్నాలజీ & VFX",layout:"compact",match:s=>/tech|vfx/i.test(s)},
 {key:"politics",label:"రాజకీయాలు",layout:"split",match:s=>/politic/i.test(s)}
];
const sectionLimit=(layout:NewsLayout)=>layout==='split'?5:layout==='compact'?12:10;
export default async function Home({searchParams}:{searchParams:Promise<{section?:string}>}){
 const {section="latest"}=await searchParams;
 const [newsResult,galleryResult]=await Promise.all([db?db.from("news_articles").select("id,slug,headline_te,headline_en,dek_te,body_te,body_en,hero_image_url,category,status,published_at,created_at").eq("status","published").order("published_at",{ascending:false,nullsFirst:false}).limit(180):Promise.resolve({data:null}),db?db.from("image_galleries").select("id,slug,title_te,title_en,description_te,cover_image_url,status,created_at").eq("status","published").order("created_at",{ascending:false}).limit(12):Promise.resolve({data:null})]);
 const news=(newsResult.data||[]) as Article[];
 const galleries=(galleryResult.data||[]) as Gallery[];
 const selected=categories.some(c=>c.key===section)?section:"latest";
 const selectedCategory=newsCategories.find(category=>category.key===selected);
 const filtered=selected==="latest"?news:news.filter(article=>selectedCategory?.match(article.category||""));
 const lead=filtered[0],side=filtered.slice(1,5);
 const galleryMode=selected==="galleries";
 const categoryGroups=newsCategories.map(group=>{
  const matching=news.filter(article=>group.match(article.category||""));
  return {...group,items:matching.slice(0,sectionLimit(group.layout))};
 });

 return <><header className="top"><div className="wrap topin"><Link href="/" className="logo" aria-label="Mee Narada home">Mee <b>Narada</b><span className="beta-mark">BETA</span></Link><nav className="desktop-nav" aria-label="Main navigation"><Link href="/">హోమ్</Link><Link href="/?section=movies">సినిమాలు</Link><Link href="/?section=ott">OTT</Link><Link href="/gallery">ఫోటోలు</Link><Link href="/videos">వీడియోలు</Link></nav><Link className="editor-link" href="/admin">Editor Login</Link></div></header>
 <div className="ticker"><div className="wrap ticker-inner"><strong>తాజా అప్‌డేట్స్</strong><span>తెలుగు సినిమా • OTT • సెలబ్రిటీలు • వినోద వార్తలు</span></div></div>
 <main className="wrap homepage"><div className="intro"><div><div className="eyebrow">మీ తెలుగు ఎంటర్‌టైన్‌మెంట్ హబ్</div><h1 className="heading">{galleryMode?"ఫోటో గ్యాలరీలు":selected==="latest"?"తాజా వార్తలు":categories.find(c=>c.key===selected)?.label}</h1></div><span className="intro-caption">సినిమా ప్రపంచం మీ ముందుకు</span></div>
 <nav className="category-strip" aria-label="News categories">{categories.map(c=><Link key={c.key} href={c.key==="latest"?"/":c.key==="galleries"?"/gallery":c.key==="short-films"?"/videos?category=short_film":"/?section="+c.key} className={selected===c.key?"selected":""}>{c.label}</Link>)}</nav>
 {!configured&&<p className="notice">Supabase public URL and anon key are not configured.</p>}
 {galleryMode?<section className="section-block"><div className="section-title"><h2>ఫోటో గ్యాలరీలు</h2></div><div className="story-grid">{galleries.map(g=><Link className="news-card" key={g.id} href={"/gallery/"+encodeURIComponent(g.slug)}><div className="news-image">{g.cover_image_url?<img src={g.cover_image_url} alt={titleOf(g)} loading="lazy"/>:<div className="image-empty">Gallery</div>}</div><div className="news-copy"><span className="category-label">GALLERY</span><h2>{titleOf(g)}</h2></div></Link>)}</div>{galleries.length===0&&<p className="muted">ఈ విభాగంలో ఇంకా ప్రచురించిన కంటెంట్ లేదు.</p>}</section>:<>
 {selected==="latest"&&lead&&<section className="lead-section" aria-label="Featured stories"><div className="lead-column">{card(lead,"lead")}</div><aside className="side-column"><div className="sidebar-heading"><span className="live-dot"/> ట్రెండింగ్ వార్తలు <span className="sidebar-more">తాజా అప్‌డేట్స్</span></div>{side.map(a=>card(a,"compact"))}</aside></section>}
 {selected==="latest"&&<Suspense fallback={<p className="muted">Loading videos…</p>}><HomeVideos/></Suspense>}
 {selected==="latest"?<div className="category-news-sections">{categoryGroups.map(group=><CategoryNews key={group.key} id={"news-"+group.key} title={group.label} articles={group.items} layout={group.layout} viewAll={"/?section="+group.key}/>)}</div>:selectedCategory&&<CategoryNews id={"news-"+selected} title={selectedCategory.label} articles={filtered} layout={selectedCategory.layout} heading={false}/>}
 {galleries.length>0&&selected==="latest"&&<section className="section-block"><div className="section-title"><h2>ఫోటో గ్యాలరీలు</h2><Link href="/gallery">అన్నీ చూడండి →</Link></div><div className="story-grid homepage-gallery-grid">{galleries.slice(0,3).map(g=><Link className="news-card" key={g.id} href={"/gallery/"+encodeURIComponent(g.slug)}><div className="news-image">{g.cover_image_url?<img src={g.cover_image_url} alt={titleOf(g)} loading="lazy"/>:<div className="image-empty">Gallery</div>}</div><div className="news-copy"><span className="category-label">GALLERY</span><h2>{titleOf(g)}</h2></div></Link>)}</div></section>}
 </>}</main><footer className="footer"><div className="wrap footer-inner"><span>© Mee Narada Beta · Telugu Entertainment</span><span>సినిమా • వార్తలు • OTT</span></div></footer></>;
}
