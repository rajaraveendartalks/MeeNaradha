import {db} from './db';
export type PublicVideo={id:string;slug:string;title_en:string|null;title_te:string|null;thumbnail_url:string|null;content_type:string|null};
export const videoFilters=[{key:'all',label:'All',te:'అన్ని వీడియోలు'},{key:'trailer',label:'Trailers',te:'ట్రైలర్లు'},{key:'song',label:'Songs',te:'పాటలు'},{key:'short_film',label:'Short Films',te:'షార్ట్ ఫిల్మ్స్'}] as const;
export const videoTitle=(video:PublicVideo)=>video.title_te||video.title_en||'Mee Narada Video';
export const videoCategory=(type:string|null)=>videoFilters.find(f=>f.key===type)?.label||'Video';
export const videoHref=(slug:string)=>'/videos/'+encodeURIComponent(slug);
export async function publishedVideos(category='all',page=1,limit=24){
 if(!db)return {data:[],error:{message:'Video service is not configured.'},count:0};
 let query=db.from('videos').select('id,slug,title_en,title_te,thumbnail_url,content_type',{count:'exact'}).eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false}).range((page-1)*limit,page*limit-1);
 if(category!=='all')query=query.eq('content_type',category);
 return query;
}
