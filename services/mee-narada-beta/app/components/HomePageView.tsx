import Link from 'next/link';
import {SiteHeaderView,SiteFooterView,MenuLinks} from './SiteNavigationView';
import {categoryLabel,findCategory} from '../../lib/site-management';
import {CategoryNews,type NewsLayout} from './CategoryNews';
import {VideoPreset} from './VideoPreset';
import {VideoFilters} from './PublicVideoCards';
import {titleOf,type Article,type Gallery} from '../../lib/db';
import {featuredStories,matchesHomeCategory,sectionStories,type HomeSettings,type HomeSection} from '../../lib/homepage';
import {HomeNewsPreset} from './HomeNewsPresets';
import type {HomeContent} from '../../lib/homepage-data';
import type {AdInventory} from '../../lib/advertising';
import AdSlot from './AdSlot';

const newsLayout=(section:HomeSection):NewsLayout=>section.preset==='lead-headlines'?'split':section.preset==='lead-cards'?'lead-grid':'compact';
function StoryCard({article,variant=''}:{article:Article;variant?:string}){
  return <Link className={'news-card '+variant} href={'/article/'+encodeURIComponent(article.slug)}><div className="news-image">{article.hero_image_url?<img src={article.hero_image_url} alt={titleOf(article)} loading={variant==='lead'?'eager':'lazy'}/>:<div className="image-empty">Mee Narada</div>}</div><div className="news-copy"><span className="category-label">{article.category||'NEWS'}</span><h2>{titleOf(article)}</h2>{variant!=='compact'&&<p>{article.dek_te||article.headline_en||''}</p>}</div></Link>;
}
function GalleryCards({galleries}:{galleries:Gallery[]}){
  return <div className="story-grid homepage-gallery-grid">{galleries.map(gallery=><Link className="news-card" key={gallery.id} href={'/gallery/'+encodeURIComponent(gallery.slug)}><div className="news-image">{gallery.cover_image_url?<img src={gallery.cover_image_url} alt={titleOf(gallery)} loading="lazy"/>:<div className="image-empty">Gallery</div>}</div><div className="news-copy"><span className="category-label">GALLERY</span><h2>{titleOf(gallery)}</h2></div></Link>)}</div>;
}
function HomepageSection({section,content,preview}:{section:HomeSection;content:HomeContent;preview:boolean}){
  if(!section.enabled)return null;
  if(section.id==='videos')return <section className="section-block public-home-videos" aria-labelledby="homepage-videos-title"><div className="section-title"><div><span className="eyebrow">TRAILERS · SONGS · SHORT FILMS</span><h2 id="homepage-videos-title">{section.title} <span className="public-video-heading-en">Videos</span></h2></div><Link href="/videos">అన్నీ చూడండి →</Link></div><VideoFilters home/>{content.videoError?<p className="notice" role="status">వీడియోలను ప్రస్తుతం లోడ్ చేయలేకపోయాము. <Link href="/videos">మళ్లీ ప్రయత్నించండి →</Link></p>:content.videos.length?<VideoPreset videos={content.videos.slice(0,section.limit)} preset={['lead-headlines','compact','lead-cards'].includes(section.preset)?section.preset as 'lead-headlines'|'compact'|'lead-cards':'lead-headlines'}/>:<p className="muted">ప్రచురించిన వీడియోలు త్వరలో ఇక్కడ కనిపిస్తాయి.</p>}</section>;
  if(section.id==='galleries')return content.galleries.length?<section className="section-block"><div className="section-title"><h2>{section.title}</h2><Link href="/gallery">అన్నీ చూడండి →</Link></div><GalleryCards galleries={content.galleries.slice(0,section.limit)}/></section>:null;
  const review=section.id==='reviews',stories=sectionStories(section,review?content.reviews||[]:content.news,review?content.reviewPins||[]:content.pinned,content.categories),viewAll=review?'/reviews':section.id==='quick-reads'?'/?section=all-news':'/?section='+section.id;
  if(review&&content.reviewError)return <section className="hp-preset"><h2>{section.title}</h2><p className="notice" role="status">రివ్యూలను ప్రస్తుతం లోడ్ చేయలేకపోయాము.</p></section>;
  if(!stories.length&&!preview&&(review||section.selection==='curated'||section.preset==='quick-reads'))return null;
  return ['feature-rows','review-showcase','quick-reads'].includes(section.preset)?<HomeNewsPreset preset={section.preset as 'feature-rows'|'review-showcase'|'quick-reads'} id={'news-'+section.id} title={section.title} stories={stories} viewAll={viewAll} preview={preview}/>:<CategoryNews id={'news-'+section.id} title={section.title} articles={stories} layout={newsLayout(section)} viewAll={viewAll} preview={preview}/>;
}
export function HomePageView({settings,content,section='latest',preview=false,adInventory}:{settings:HomeSettings;content:HomeContent;section?:string;preview?:boolean;adInventory?:AdInventory}){
  const found=findCategory(content.categories,section),selected=section==='all-news'?'all-news':section==='galleries'?'galleries':found?.slug||'latest',category=selected==='all-news'?{id:'all-news',title:'తాజా వార్తలు',enabled:true,limit:180,preset:'compact' as const}:settings.sections.find(row=>row.id===selected)||(found?{id:found.slug,title:categoryLabel(found),enabled:true,limit:24,preset:'lead-cards' as const}:undefined),galleryMode=selected==='galleries';
  const sidebar=settings.sections.filter(row=>row.enabled&&row.preset==='quick-reads'&&sectionStories(row,content.news,content.pinned,content.categories).length>0),mainSections=settings.sections.filter(row=>row.preset!=='quick-reads');
  const {lead,stories}=featuredStories(settings,content.news,content.pinned);
  return <div className="public-home-page"><SiteHeaderView navigation={content.navigation} editorLogin/>
    {!preview&&adInventory&&(content.news.length>0||content.galleries.length>0||content.videos.length>0)&&<div className="wrap"><AdSlot inventory={adInventory} placement="home_header" category={found?.slug||''}/></div>}
    {settings.ticker.enabled&&<div className="ticker"><div className="wrap ticker-inner"><strong>{settings.ticker.label}</strong><span>{settings.ticker.text}</span></div></div>}
    <main className="wrap homepage"><div className="intro"><div><div className="eyebrow">{settings.intro.eyebrow}</div><h1 className="heading">{galleryMode?'ఫోటో గ్యాలరీలు':selected==='latest'?settings.intro.title:found?categoryLabel(found):category?.title}</h1></div><span className="intro-caption">{settings.intro.caption}</span></div>
      <nav className="category-strip" aria-label="News categories"><MenuLinks items={content.navigation.menus.categories} selected={selected}/></nav>
      {content.contentError&&<p className="notice" role="status">కొంత కంటెంట్ ప్రస్తుతం అందుబాటులో లేదు. దయచేసి మళ్లీ ప్రయత్నించండి.</p>}
      {galleryMode?<section className="section-block"><div className="section-title"><h2>ఫోటో గ్యాలరీలు</h2></div><GalleryCards galleries={content.galleries}/>{!content.galleries.length&&<p className="muted">ఈ విభాగంలో ఇంకా ప్రచురించిన కంటెంట్ లేదు.</p>}</section>:selected==='latest'?<>
        {settings.featured.enabled&&lead&&<section className="lead-section" aria-label="Featured stories"><div className="lead-column"><StoryCard article={lead} variant="lead"/></div>{stories.length>0&&<aside className="side-column"><div className="sidebar-heading"><span className="live-dot"/> {settings.featured.title} <span className="sidebar-more">తాజా అప్‌డేట్స్</span></div>{stories.map(article=><StoryCard key={article.id} article={article} variant="compact"/>)}</aside>}</section>}
        {!preview&&adInventory&&lead&&<AdSlot inventory={adInventory} placement="home_feed"/>}<div className={'category-news-sections'+(sidebar.length?' hp-home-columns':'')}>{sidebar.length?<div className="hp-home-main">{mainSections.map(row=><HomepageSection key={row.id} section={row} content={content} preview={preview}/>)}</div>:mainSections.map(row=><HomepageSection key={row.id} section={row} content={content} preview={preview}/>)}{sidebar.length>0&&<aside className="hp-home-sidebar" aria-label="Quick Reads">{sidebar.map(row=><HomepageSection key={row.id} section={row} content={content} preview={preview}/>)}</aside>}</div>
      </>:category&&<CategoryNews id={'news-'+selected} title={category.title} articles={content.news.filter(article=>article.status==='published'&&(selected==='all-news'||matchesHomeCategory(article.category,category.id,content.categories)))} layout={newsLayout(category)} heading={false} preview={preview}/>}
    </main><SiteFooterView navigation={content.navigation} beta/></div>;
}
