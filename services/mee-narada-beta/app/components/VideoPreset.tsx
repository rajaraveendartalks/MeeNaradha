import Link from 'next/link';
import {type PublicVideo} from '../../lib/public-videos';
import {PublicVideoCard} from './PublicVideoCards';
export type VideoPresetName='lead-headlines'|'compact'|'lead-cards';
export function VideoPreset({videos,preset='lead-headlines',id,title,viewAll}:{videos:PublicVideo[];preset?:VideoPresetName;id?:string;title?:string;viewAll?:string}){
 const [lead,...rest]=videos;
 if(!lead)return null;
 return <section className={'vp-section vp-'+preset+(videos.length===1?' vp-single':'')} aria-labelledby={title?id:undefined} aria-label={title?undefined:'Published videos'}>
  {title&&<div className="nc-heading"><h2 id={id}>{title}</h2>{viewAll&&<Link href={viewAll}>అన్నీ చూడండి →</Link>}</div>}
  {preset==='lead-headlines'?<><div className="vp-body"><PublicVideoCard video={lead} variant="lead"/>{rest.length>0&&<div className="vp-headlines">{rest.slice(0,5).map(video=><PublicVideoCard key={video.id} video={video} variant="compact"/>)}</div>}</div>{rest.length>5&&<div className="vp-more">{rest.slice(5).map(video=><PublicVideoCard key={video.id} video={video}/>)}</div>}</>:<div className="vp-body">{videos.map((video,index)=><PublicVideoCard key={video.id} video={video} variant={preset==='compact'?'compact':index===0?'lead':'card'}/>)}</div>}
 </section>;
}
