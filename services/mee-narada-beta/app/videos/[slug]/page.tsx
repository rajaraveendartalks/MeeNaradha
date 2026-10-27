import Link from "next/link";
import {notFound} from "next/navigation";
import {db} from "../../../lib/db";
import {type VideoSummary,videoLabel,videoTitle} from "../../../lib/video";
import {PublicHeader,PublicFooter} from "../../components/PublicChrome";
import {VideoCard} from "../../components/VideoCard";
export const dynamic="force-dynamic";
export default async function VideoPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;if(!db)throw new Error("Video service is not configured.");
 const {data:video,error}=await db.from("videos").select("*").eq("slug",slug).eq("status","published").maybeSingle();
 if(error)throw new Error("Unable to load the video.");if(!video)notFound();
 const {data:next}=await db.from("videos").select("id,slug,title_te,title_en,thumbnail_url,content_type").eq("status","published").neq("id",video.id).order("created_at",{ascending:false}).limit(4);
 const id=/^[a-zA-Z0-9_-]{11}$/.test(video.external_id||"")?video.external_id:null;
 return <><PublicHeader active="videos"/><main id="main-content" className="mn-container mn-detail"><nav className="mn-breadcrumb" aria-label="Breadcrumb"><Link href="/">హోమ్</Link><span aria-hidden="true">/</span><Link href="/videos">వీడియోలు</Link></nav><div className="mn-detail-layout"><article className="mn-detail-main"><div className="mn-player">{id?<iframe title={videoTitle(video)} src={"https://www.youtube-nocookie.com/embed/"+id} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:<div className="mn-empty"><a href={video.video_url} target="_blank" rel="noreferrer">Watch original video ↗</a></div>}</div><div className="mn-detail-copy"><span className="mn-category">{videoLabel(video.content_type)}</span><h1>{videoTitle(video)}</h1><div className="mn-detail-actions"><Link href={"/videos?category="+(video.content_type||"all")}>మరిన్ని వీడియోలు ↗</Link>{video.video_url&&<a href={video.video_url} target="_blank" rel="noreferrer" className="mn-youtube-link">Watch on YouTube ↗</a>}</div>{(video.description_te||video.description_en)&&<section className="mn-description"><h2>ఈ వీడియో గురించి</h2><p>{video.description_te||video.description_en}</p></section>}</div></article>{next&&next.length>0&&<aside className="mn-up-next"><p className="mn-eyebrow">KEEP WATCHING</p><h2>మరిన్ని వీడియోలు</h2>{(next as VideoSummary[]).map(item=><VideoCard key={item.id} video={item} variant="compact"/>)}</aside>}</div></main><PublicFooter/></>;
}
