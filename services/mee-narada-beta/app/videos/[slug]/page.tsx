import Link from 'next/link';
import {notFound} from 'next/navigation';
import {db} from '../../../lib/db';
import {videoTitle,videoCategory} from '../../../lib/public-videos';
import {VideoHeader} from '../../components/PublicVideoCards';
export const dynamic='force-dynamic';
export default async function Video({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!db)throw new Error('Video service unavailable');
 const {data:video,error}=await db.from('videos').select('id,slug,title_te,title_en,thumbnail_url,content_type,external_id,video_url,description_te,description_en').eq('status','published').eq('slug',slug).maybeSingle();
 if(error)throw new Error('Unable to load video');
 if(!video)notFound();
 const youtubeId=/^[a-zA-Z0-9_-]{11}$/.test(video.external_id||'')?video.external_id:null;
 const originalUrl=typeof video.video_url==='string'&&/^https:\/\//i.test(video.video_url)?video.video_url:null;
 return <><VideoHeader/><main className="detail public-video-detail"><nav aria-label="Breadcrumb"><Link href="/videos">← Videos</Link></nav><p className="category-label">{videoCategory(video.content_type)}</p><h1>{videoTitle(video)}</h1>{youtubeId?<div className="video-embed"><iframe src={'https://www.youtube-nocookie.com/embed/'+youtubeId} title={videoTitle(video)} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>:<p className="notice">Watch this video on the original channel using the link below.</p>}{(video.description_te||video.description_en)&&<p className="public-video-description">{video.description_te||video.description_en}</p>}<div className="actions">{originalUrl&&<a className="btn" href={originalUrl} target="_blank" rel="noopener noreferrer">Watch original video ↗</a>}<Link className="btn secondary" href={'/videos?category='+(video.content_type||'all')}>More {videoCategory(video.content_type)} →</Link></div></main><footer className="footer">© Mee Narada · Telugu Entertainment</footer></>;
}
