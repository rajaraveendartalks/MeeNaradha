import Link from "next/link";
import {type VideoSummary,videoLabel,videoTitle} from "../../lib/video";
export function VideoCard({video,variant="standard",priority=false}:{video:VideoSummary;variant?:"standard"|"compact"|"feature";priority?:boolean}){
 const Heading=variant==="feature"?"h2":"h3";
 return <Link href={"/videos/"+encodeURIComponent(video.slug)} className={"mn-video-card mn-video-card--"+variant}><div className="mn-video-image">{video.thumbnail_url?<img src={video.thumbnail_url} alt="" loading={priority?"eager":"lazy"}/>:<span className="mn-image-empty">Mee Narada</span>}<span className="mn-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m9 5 11 7-11 7z"/></svg></span></div><div className="mn-video-copy"><span className="mn-category">{videoLabel(video.content_type)}</span><Heading>{videoTitle(video)}</Heading>{variant==="feature"&&<span className="mn-watch">వీడియో చూడండి <span aria-hidden="true">↗</span></span>}</div></Link>;
}
