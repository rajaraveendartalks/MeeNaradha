import type {Metadata} from 'next';
import Link from 'next/link';
import {publishedVideos,videoFilters} from '../../lib/public-videos';
import {PublicVideoCard,VideoFilters,VideoHeader} from '../components/PublicVideoCards';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Videos | Mee Narada',description:'Watch Telugu trailers, songs and short films on Mee Narada.',alternates:{canonical:'https://www.meenarada.com/videos'}};
export default async function Videos({searchParams}:{searchParams:Promise<{category?:string;page?:string}>}){
 const params=await searchParams;
 const category=videoFilters.some(f=>f.key===params.category)?params.category!:'all';
 const parsed=Number(params.page),page=Number.isSafeInteger(parsed)&&parsed>0&&parsed<=10000?parsed:1;
 const {data,error,count}=await publishedVideos(category,page);
 const pageHref=(next:number)=>'/videos?'+new URLSearchParams({...category!=='all'?{category}:{},page:String(next)});
 if(error)console.error('Public videos query failed',error.message);
 return <><VideoHeader/><main className="wrap gallery-home public-videos"><div className="eyebrow">MEE NARADA · VIDEO STORIES</div><h1>వీడియోలు <span>Videos</span></h1><p className="gallery-home-intro">తెలుగు ట్రైలర్లు, పాటలు, షార్ట్ ఫిల్మ్స్ — మీకు నచ్చినవి ఎంచుకోండి.</p><VideoFilters selected={category}/>{error?<p className="notice" role="alert">వీడియోలను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.</p>:<><p className="gallery-result-count">{count||0} {count===1?'video':'videos'} · {videoFilters.find(f=>f.key===category)?.label}</p>{data?.length?<div className="public-video-grid">{data.map(video=><PublicVideoCard key={video.id} video={video}/>)}</div>:<div className="gallery-empty"><h2>ఇంకా వీడియోలు లేవు</h2><p>No published videos on this page.</p><Link href="/videos">View all videos →</Link></div>}<nav className="public-video-pagination" aria-label="Video pages">{page>1&&<Link href={pageHref(page-1)}>← Previous</Link>}{page*24<(count||0)&&<Link href={pageHref(page+1)}>Next →</Link>}</nav></>}</main><footer className="footer">© Mee Narada · Telugu Entertainment</footer></>;
}
