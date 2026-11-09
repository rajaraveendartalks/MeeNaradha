import type {SupabaseClient} from '@supabase/supabase-js';
import type {Article} from './db';
export type ArticleRecord=Article&{dek_en:string|null};
export const articleRouteColumns='id,slug,headline_te,headline_en,dek_te,dek_en,body_te,body_en,hero_image_url,category,status,published_at,created_at,auto_link_entities';
/** Hosted route params may still contain URI escapes. Keep exact legacy matches first. */
export function articleSlugCandidates(raw:string):string[]{
 if(typeof raw!=='string'||!raw||raw.length>2048)return [];
 const candidates:string[]=[];
 const add=(value:string)=>{if(value&&!/[\u0000-\u001f\u007f]/u.test(value)&&!candidates.includes(value))candidates.push(value)};
 let current=raw;
 for(let depth=0;depth<=2;depth++){
  add(current);add(current.normalize('NFC'));add(current.normalize('NFD'));
  try{const decoded=decodeURIComponent(current);if(decoded===current)break;current=decoded}catch{break}
 }
 return candidates;
}
export async function loadPublishedArticle(client:SupabaseClient,raw:string):Promise<ArticleRecord|null>{
 const candidates=articleSlugCandidates(raw);if(!candidates.length)return null;
 const result=await client.from('news_articles').select(articleRouteColumns).eq('status','published').in('slug',candidates);
 // Storage/network failures are availability errors, not evidence of a missing article.
 if(result.error)throw new Error('The article could not be loaded. Please try again.');
 const rows=(result.data||[]) as ArticleRecord[];
 for(const slug of candidates){const article=rows.find(row=>row.slug===slug&&row.status==='published');if(article)return article}
 return null;
}
