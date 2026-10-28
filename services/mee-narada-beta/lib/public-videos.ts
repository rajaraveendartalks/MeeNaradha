import {db} from './db';
export type PublicVideo={id:string;slug:string;title_en:string|null;title_te:string|null;thumbnail_url:string|null;content_type:string|null;external_id?:string|null;video_url?:string|null};
export const videoFilters=[{key:'all',label:'All',te:'అన్ని వీడియోలు'},{key:'trailer',label:'Trailers',te:'ట్రైలర్లు'},{key:'song',label:'Songs',te:'పాటలు'},{key:'short_film',label:'Short Films',te:'షార్ట్ ఫిల్మ్స్'}] as const;
export const videoTitle=(video:PublicVideo)=>video.title_te||video.title_en||'Mee Narada Video';
export const videoCategory=(type:string|null)=>videoFilters.find(f=>f.key===type)?.label||'Video';
export const videoHref=(slug:string)=>'/videos/'+encodeURIComponent(slug);
export async function publishedVideos(category='all',page=1,limit=24){
 if(!db)return {data:[],error:{message:'Video service is not configured.'},count:0};
 let query=db.from('videos').select('id,slug,title_en,title_te,thumbnail_url,content_type,external_id,video_url',{count:'exact'}).eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false}).range((page-1)*limit,page*limit-1);
 if(category!=='all')query=query.eq('content_type',category);
 return query;
}

export function youtubeId(video:Pick<PublicVideo,'external_id'|'video_url'>){
 if(/^[A-Za-z0-9_-]{11}$/.test(video.external_id||''))return video.external_id!;
 try{const url=new URL(video.video_url||'');const host=url.hostname.toLowerCase().replace(/^www\./,'');let id:string|null=null;
  if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
  else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=url.searchParams.get('v')||(/^\/(shorts|embed)\//.test(url.pathname)?url.pathname.split('/')[2]:null);
  return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null}
}
export function videoThumbnail(video:PublicVideo){
 const id=youtubeId(video);
 if(id&&(!video.thumbnail_url||/^https:\/\/(img\.youtube\.com|i\.ytimg\.com)\//i.test(video.thumbnail_url)))return 'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';
 return video.thumbnail_url;
}
