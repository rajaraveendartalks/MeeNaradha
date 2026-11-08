import Link from 'next/link';
import {SiteLogo} from './SiteLogo';
import {CategoryNews,type NewsLayout} from './CategoryNews';
import {VideoPreset} from './VideoPreset';
import {VideoFilters} from './PublicVideoCards';
import {titleOf,type Article,type Gallery} from '../../lib/db';
import {featuredStories,homeCategories,matchesHomeCategory,type HomeSettings,type HomeSection} from '../../lib/homepage';
import type {HomeContent} from '../../lib/homepage-data';

const newsLayout=(section:HomeSection):NewsLayout=>section.preset==='lead-headlines'?'split':section.preset==='lead-cards'?'lead-grid':'compact';
function StoryCard({article,variant=''}:{article:Article;variant?:string}){
  return <Link className={'news-card '+variant} href={'/article/'+encodeURIComponent(article.slug)}><div className="news-image">{article.hero_image_url?<img src={article.hero_image_url} alt={titleOf(article)} loading={variant==='lead'?'eager':'lazy'}/>:<div className="image-empty">Mee Narada</div>}</div><div className="news-copy"><span className="category-label">{article.category||'NEWS'}</span><h2>{titleOf(article)}</h2>{variant!=='compact'&&<p>{article.dek_te||article.headline_en||''}</p>}</div></Link>;
}
function GalleryCards({galleries}:{galleries:Gallery[]}){
  return <div className="story-grid homepage-gallery-grid">{galleries.map(gallery=><Link className="news-card" key={gallery.id} href={'/gallery/'+encodeURIComponent(gallery.slug)}><div className="news-image">{gallery.cover_image_url?<img src={gallery.cover_image_url} alt={titleOf(gallery)} loading="lazy"/>:<div className="image-empty">Gallery</div>}</div><div className="news-copy"><span className="category-label">GALLERY</span><h2>{titleOf(gallery)}</h2></div></Link>)}</div>;
}
function HomepageSection({section,content,preview}:{section:HomeSection;content:HomeContent;preview:boolean}){
  if(!section.enabled)return null;
  if(section.id==='videos')return <section className="section-block public-home-videos" aria-labelledby="homepage-videos-title"><div className="section-title"><div><span className="eyebrow">TRAILERS · SONGS · SHORT FILMS</span><h2 id="homepage-videos-title">{section.title} <span className="public-video-heading-en">Videos</span></h2></div><Link href="/videos">అన్నీ చూడండి →</Link></div><VideoFilters home/>{content.videoError?<p className="notice" role="status">వీడియోలను ప్రస్తుతం లోడ్ చేయలేకపోయాము. <Link href="/videos">మళ్లీ ప్రయత్నించండి →</Link></p>:content.videos.length?<VideoPreset videos={content.videos.slice(0,section.limit)} preset={section.preset}/>:<p className="muted">ప్రచురించిన వీడియోలు త్వరలో ఇక్కడ కనిపిస్తాయి.</p>}</section>;
  if(section.id==='galleries')return content.galleries.length?<section className="section-block"><div className="section-title"><h2>{section.title}</h2><Link href="/gallery">అన్నీ చూడండి →</Link></div><GalleryCards galleries={content.galleries.slice(0,section.limit)}/></section>:null;
  return <CategoryNews id={'news-'+section.id} title={section.title} articles={content.news.filter(article=>matchesHomeCategory(article.category,section.id)).slice(0,section.limit)} layout={newsLayout(section)} viewAll={'/?section='+section.id} preview={preview}/>;
}
export function HomePageView({settings,content,section='latest',preview=false}:{settings:HomeSettings;content:HomeContent;section?:string;preview?:boolean}){
  const selected=homeCategories.some(category=>category.key===section)?section:'latest',category=settings.sections.find(row=>row.id===selected),galleryMode=selected==='galleries';
  const {lead,stories}=featuredStories(settings,content.news,content.pinned);
  return <div className="public-home-page"><header className="top"><div className="wrap topin"><SiteLogo/><nav className="desktop-nav" aria-label="Main navigation"><Link href="/">హోమ్</Link><Link href="/?section=movies">సినిమాలు</Link><Link href="/?section=ott">OTT</Link><Link href="/gallery">ఫోటోలు</Link><Link href="/videos">వీడియోలు</Link></nav><Link className="editor-link" href="/admin">Editor Login</Link></div></header>
    {settings.ticker.enabled&&<div className="ticker"><div className="wrap ticker-inner"><strong>{settings.ticker.label}</strong><span>{settings.ticker.text}</span></div></div>}
    <main className="wrap homepage"><div className="intro"><div><div className="eyebrow">{settings.intro.eyebrow}</div><h1 className="heading">{galleryMode?'ఫోటో గ్యాలరీలు':selected==='latest'?settings.intro.title:homeCategories.find(row=>row.key===selected)?.label}</h1></div><span className="intro-caption">{settings.intro.caption}</span></div>
      <nav className="category-strip" aria-label="News categories">{homeCategories.map(row=><Link key={row.key} href={row.key==='latest'?'/':row.key==='galleries'?'/gallery':row.key==='short-films'?'/videos?category=short_film':'/?section='+row.key} className={selected===row.key?'selected':''}>{row.label}</Link>)}</nav>
      {content.contentError&&<p className="notice" role="status">కొంత కంటెంట్ ప్రస్తుతం అందుబాటులో లేదు. దయచేసి మళ్లీ ప్రయత్నించండి.</p>}
      {galleryMode?<section className="section-block"><div className="section-title"><h2>ఫోటో గ్యాలరీలు</h2></div><GalleryCards galleries={content.galleries}/>{!content.galleries.length&&<p className="muted">ఈ విభాగంలో ఇంకా ప్రచురించిన కంటెంట్ లేదు.</p>}</section>:selected==='latest'?<>
        {settings.featured.enabled&&lead&&<section className="lead-section" aria-label="Featured stories"><div className="lead-column"><StoryCard article={lead} variant="lead"/></div>{stories.length>0&&<aside className="side-column"><div className="sidebar-heading"><span className="live-dot"/> {settings.featured.title} <span className="sidebar-more">తాజా అప్‌డేట్స్</span></div>{stories.map(article=><StoryCard key={article.id} article={article} variant="compact"/>)}</aside>}</section>}
        <div className="category-news-sections">{settings.sections.map(row=><HomepageSection key={row.id} section={row} content={content} preview={preview}/>)}</div>
      </>:category&&<CategoryNews id={'news-'+selected} title={category.title} articles={content.news.filter(article=>matchesHomeCategory(article.category,category.id))} layout={newsLayout(category)} heading={false} preview={preview}/>}
    </main><footer className="footer"><div className="wrap footer-inner"><span>© Mee Narada Beta · Telugu Entertainment</span><span>సినిమా • వార్తలు • OTT</span></div></footer></div>;
}
