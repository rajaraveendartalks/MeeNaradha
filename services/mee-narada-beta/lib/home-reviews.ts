import type {SupabaseClient} from '@supabase/supabase-js';
import {articleSlugCandidates} from './article-routing';
import type {HomeStory} from './homepage';
type RelatedMovie={status:string;poster_url:string|null;backdrop_url:string|null};
type RelatedOtt={status:string;movie:RelatedMovie|RelatedMovie[]|null};
type ReviewRow={id:string;slug:string;title_te:string|null;title_en:string;rating:number|string|null;verdict_te:string|null;verdict_en:string|null;body_te?:string|null;body_en?:string|null;status:string;published_at:string|null;created_at:string;movie:RelatedMovie|RelatedMovie[]|null;ott:RelatedOtt|RelatedOtt[]|null};
const joins='movie:movies!reviews_movie_id_fkey(status,poster_url,backdrop_url),ott:ott_titles!reviews_ott_title_id_fkey(status,movie:movies!ott_titles_movie_id_fkey(status,poster_url,backdrop_url))';
export const homeReviewColumns='id,slug,title_te,title_en,rating,verdict_te,verdict_en,status,published_at,created_at,'+joins;
function first<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}
export function reviewStory(row:ReviewRow):HomeStory{
 const ott=first(row.ott),movie=first(row.movie)||(ott?.status==='published'?first(ott.movie):null),rating=row.rating===null?null:Number(row.rating);
 return {id:row.id,slug:row.slug,content_kind:'review',headline_te:row.title_te,headline_en:row.title_en,dek_te:row.verdict_te||row.verdict_en,hero_image_url:movie?.status==='published'?movie.backdrop_url||movie.poster_url:null,rating:rating!==null&&Number.isFinite(rating)&&rating>=0&&rating<=10?rating:null,body_te:row.body_te||null,body_en:row.body_en||null,category:'reviews',status:row.status,published_at:row.published_at,created_at:row.created_at};
}
export async function loadHomeReviews(client:SupabaseClient,options:{ids?:string[];search?:string;page?:number;fullSlug?:string}={}){
 let query=client.from('reviews').select(homeReviewColumns+(options.fullSlug?',body_te,body_en':''),{count:'exact'}).eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false});
 if(options.ids){if(!options.ids.length)return {stories:[],count:0};query=query.in('id',[...new Set(options.ids)])}
 if(options.fullSlug){const slugs=articleSlugCandidates(options.fullSlug);if(!slugs.length)return {stories:[],count:0};query=query.in('slug',slugs)}
 const term=(options.search||'').replace(/[(),.%\\]/g,' ').trim().slice(0,100);if(term)query=query.or('title_te.ilike.%'+term+'%,title_en.ilike.%'+term+'%');
 const size=options.page?20:60,page=Math.max(1,Math.min(500,options.page||1));query=options.ids||options.fullSlug?query.limit(options.ids?.length||12):query.range((page-1)*size,page*size-1);
 const result=await query;if(result.error)throw Error('Published reviews could not be loaded. Please try again.');
 return {stories:((result.data||[]) as unknown as ReviewRow[]).filter(row=>row.status==='published').map(reviewStory),count:result.count||0};
}
export async function loadPublishedReview(client:SupabaseClient,raw:string){const {stories}=await loadHomeReviews(client,{fullSlug:raw});for(const slug of articleSlugCandidates(raw)){const story=stories.find(row=>row.slug===slug);if(story)return story}return null}
