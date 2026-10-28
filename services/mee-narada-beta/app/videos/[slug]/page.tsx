import Link from 'next/link';
import {notFound} from 'next/navigation';
import {db} from '../../../lib/db';
import {videoTitle,videoCategory,youtubeId} from '../../../lib/public-videos';
import {VideoHeader} from '../../components/PublicVideoCards';
export const dynamic='force-dynamic';
export default async function Video({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!db)throw new Error('Video service unavailable');
 // Preserve exact legacy slugs before trying bounded decoding of hosted params.
 const candidates=[slug];
 for(let depth=0;depth<2;depth++){
  try{const decoded=decodeURIComponent(candidates[candidates.length-1]);if(candidates.includes(decoded))break;candidates.push(decoded)}catch{break}
 }
 const legacySpaces=candidates[candidates.length-1].replace(/\+/g,' ');
 if(!candidates.includes(legacySpaces))candidates.push(legacySpaces);
 let video=null;
 for(const candidate of candidates){
  const result=await db.from('videos').select('id,slug,title_te,title_en,thumbnail_url,content_type,external_id,video_url,description_te,description_en').eq('status','published').eq('slug',candidate).maybeSingle();
  if(result.error)throw new Error('Unable to load video');
  if(result.data){video=result.data;break}
 }
 if(!video)notFound();
 const embedId=youtubeId(video);
 const originalUrl=typeof video.video_url==='string'&&/^https:\/\//i.test(video.video_url)?video.video_url:null;
 return <><VideoHeader/><main className="detail public-video-detail"><nav aria-label="Breadcrumb"><Link href="/videos">← Videos</Link></nav><p className="category-label">{videoCategory(video.content_type)}</p><h1>{videoTitle(video)}</h1>{embedId?<div className="video-embed"><iframe src={'https://www.youtube-nocookie.com/embed/'+embedId} title={videoTitle(video)} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>:<p className="notice">Watch this video on the original channel using the link below.</p>}{(video.description_te||video.description_en)&&<p className="public-video-description">{video.description_te||video.description_en}</p>}<div className="actions">{originalUrl&&<a className="btn" href={originalUrl} target="_blank" rel="noopener noreferrer">Watch original video ↗</a>}<Link className="btn secondary" href={'/videos?category='+(video.content_type||'all')}>More {videoCategory(video.content_type)} →</Link></div></main><footer className="footer">© Mee Narada · Telugu Entertainment</footer></>;
}
