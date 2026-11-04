import Link from 'next/link';
import {notFound} from 'next/navigation';
import {publishedVideos,videoFilters} from '../../../lib/public-videos';
import {VideoPreset} from '../../components/VideoPreset';
export const metadata={title:'Video Presets · Design Preview',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function VideoPresets({searchParams}:{searchParams:Promise<{category?:string}>}){
 if(process.env.VERCEL_ENV==='production')notFound();
 const {category}=await searchParams,selected=videoFilters.some(f=>f.key===category)?category!:'all';
 const {data,error}=await publishedVideos(selected,1,10);
 return <><header className="top"><div className="wrap topin"><Link href="/" className="logo">Mee <b>Narada</b></Link><Link href="/design/news-layouts">← News Presets</Link></div></header><main className="wrap news-design-preview"><p className="eyebrow">VIDEO PRESETS · DESIGN PREVIEW</p><h1>Video Presets</h1><p className="video-presets-intro">The same editorial layouts, adapted for trailers, songs and short films with 16:9 thumbnails and watch links. This preview uses published videos from this environment; the homepage and category pages share these components.</p><nav className="gallery-filters" aria-label="Preview video category">{videoFilters.map(filter=><Link key={filter.key} className={selected===filter.key?'active':''} aria-current={selected===filter.key?'page':undefined} href={'/design/video-presets'+(filter.key==='all'?'':'?category='+filter.key)}><span>{filter.te}</span><small>{filter.label}</small></Link>)}</nav><nav className="news-preview-tabs" aria-label="Video presets"><a href="#video-headlines">Lead + Videos</a><a href="#video-compact">Compact Rows</a><a href="#video-cards">Lead + Cards</a></nav>{error?<p className="notice">Unable to load preview videos. Please try again.</p>:data?.length?<><VideoPreset id="video-headlines" title="Lead + Videos" videos={data.slice(0,6)}/><VideoPreset id="video-compact" title="Compact Rows" videos={data} preset="compact"/><VideoPreset id="video-cards" title="Lead + Cards" videos={data} preset="lead-cards"/></>:<p className="muted">No published videos in this category yet.</p>}</main></>;
}
