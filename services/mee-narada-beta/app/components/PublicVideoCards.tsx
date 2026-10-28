import Link from 'next/link';
import {type PublicVideo,videoTitle,videoCategory,videoHref,videoFilters} from '../../lib/public-videos';
export function PublicVideoCard({video}:{video:PublicVideo}){
 return <Link href={videoHref(video.slug)} className="public-video-card"><div className="public-video-image">{video.thumbnail_url?<img src={video.thumbnail_url} alt="" loading="lazy"/>:<span>Mee Narada</span>}<span className="public-video-play" aria-hidden="true">▶</span></div><div className="public-video-copy"><span className="category-label">{videoCategory(video.content_type)}</span><h3>{videoTitle(video)}</h3><span className="public-video-watch">వీడియో చూడండి →</span></div></Link>;
}
export function VideoFilters({selected='all',home=false}:{selected?:string;home?:boolean}){
 return <nav className="gallery-filters public-video-filters" aria-label="Video categories">{videoFilters.map(f=><Link key={f.key} href={f.key==='all'?'/videos':'/videos?category='+f.key} className={!home&&selected===f.key?'active':''} aria-current={!home&&selected===f.key?'page':undefined}><span>{f.te}</span><small>{f.label}</small></Link>)}</nav>;
}
export function VideoHeader(){return <header className="top"><div className="wrap topin"><Link href="/" className="logo">Mee <b>Narada</b></Link><nav className="nav" aria-label="Main navigation"><Link href="/">← Home</Link><Link href="/videos" aria-current="page">Videos</Link><Link href="/gallery">Photos</Link></nav></div></header>}
