import Link from 'next/link';
import {publishedVideos} from '../../lib/public-videos';
import {VideoFilters} from './PublicVideoCards';
import {VideoPreset} from './VideoPreset';
export default async function HomeVideos(){
 const {data,error}=await publishedVideos('all',1,6);
 if(error)console.error('Homepage videos query failed',error.message);
 return <section className="section-block public-home-videos" aria-labelledby="homepage-videos-title"><div className="section-title"><div><span className="eyebrow">TRAILERS · SONGS · SHORT FILMS</span><h2 id="homepage-videos-title">వీడియోలు <span className="public-video-heading-en">Videos</span></h2></div><Link href="/videos">అన్నీ చూడండి →</Link></div><VideoFilters home/>{error?<p className="notice" role="status">వీడియోలను ప్రస్తుతం లోడ్ చేయలేకపోయాము. <Link href="/videos">మళ్లీ ప్రయత్నించండి →</Link></p>:data?.length?<VideoPreset videos={data}/>:<p className="muted">ప్రచురించిన వీడియోలు త్వరలో ఇక్కడ కనిపిస్తాయి.</p>}</section>;
}
