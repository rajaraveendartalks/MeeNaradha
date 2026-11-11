import type {SupabaseClient} from '@supabase/supabase-js';
import type {Article,Gallery} from './db';
import type {PublicVideo} from './public-videos';
import {defaultHomeSettings,normalizeHomeSettings,validateHomeSettings,type HomeSettings,type HomeStory} from './homepage';
import {loadHomeReviews} from './home-reviews';
import {defaultCategories,defaultNavigation,loadCategories,loadPublishedNavigation,type ContentCategory,type NavigationConfig} from './site-management';

export const homeArticleColumns='id,slug,headline_te,headline_en,dek_te,hero_image_url,category,status,published_at,created_at';
export type HomeContent={news:Article[];pinned:Article[];reviews:HomeStory[];reviewPins:HomeStory[];reviewError:boolean;galleries:Gallery[];videos:PublicVideo[];videoError:boolean;contentError:boolean;categories:ContentCategory[];navigation:NavigationConfig};
export const emptyHomeContent=():HomeContent=>({news:[],pinned:[],reviews:[],reviewPins:[],reviewError:false,galleries:[],videos:[],videoError:false,contentError:false,categories:defaultCategories(),navigation:defaultNavigation()});
export type HomepageRecord={id:'draft'|'published';config:HomeSettings;revision:number;updated_at:string};
export type HomepageState={draft:HomepageRecord;published:HomepageRecord};
function record(value:Record<string,unknown>):HomepageRecord{return {id:value.id as HomepageRecord['id'],config:normalizeHomeSettings(value.config),revision:Number(value.revision),updated_at:String(value.updated_at)}}
export async function loadHomepageState(client:SupabaseClient):Promise<HomepageState>{
  const result=await client.from('homepage_settings').select('id,config,revision,updated_at').in('id',['draft','published']);
  if(result.error)throw result.error;
  const draft=result.data?.find(row=>row.id==='draft'),published=result.data?.find(row=>row.id==='published');
  if(!draft||!published)throw Error('Homepage settings are not available. Please contact your administrator.');
  return {draft:record(draft),published:record(published)};
}
export async function loadPublishedHomepage(client:SupabaseClient):Promise<HomeSettings>{
  const result=await client.from('homepage_settings').select('config').eq('id','published').maybeSingle();
  if(result.error)console.error('Homepage settings query failed',result.error.message);
  return result.data?normalizeHomeSettings(result.data.config):defaultHomeSettings();
}
export async function saveHomepage(client:SupabaseClient,config:HomeSettings,state:HomepageState,publish=false):Promise<HomepageState>{
  const valid=validateHomeSettings(config),result=await client.rpc('save_homepage_settings',{p_config:valid,p_draft_revision:state.draft.revision,p_published_revision:state.published.revision,p_publish:publish});
  if(result.error){if(result.error.code==='40001')throw Error('The homepage changed in another session. Reload the latest version before saving.');throw result.error}
  if(!result.data?.draft||!result.data?.published)throw Error('The homepage could not be saved. Please reload and try again.');
  return {draft:record(result.data.draft),published:record(result.data.published)};
}
export async function loadHomeContent(client:SupabaseClient):Promise<HomeContent>{
  const [news,galleries,videos,categories,navigation,reviews]=await Promise.all([
    client.from('news_articles').select(homeArticleColumns).eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false}).limit(180),
    client.from('image_galleries').select('id,slug,title_te,title_en,description_te,cover_image_url,status,created_at').eq('status','published').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(12),
    client.from('videos').select('id,slug,title_en,title_te,thumbnail_url,content_type,external_id,video_url').eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false}).limit(12),loadCategories(client),loadPublishedNavigation(client),loadHomeReviews(client).then(result=>({stories:result.stories,error:false})).catch(()=>({stories:[],error:true}))
  ]);
  for(const result of [news,galleries,videos])if(result.error)console.error('Homepage content query failed',result.error.message);
  return {news:(news.data||[]) as Article[],pinned:[],reviews:reviews.stories,reviewPins:[],reviewError:reviews.error,galleries:(galleries.data||[]) as Gallery[],videos:(videos.data||[]) as PublicVideo[],videoError:Boolean(videos.error),contentError:Boolean(news.error||galleries.error),categories,navigation};
}
export async function loadPinnedStories(client:SupabaseClient,config:HomeSettings,known:Article[]=[]){
  const ids=[...new Set([config.featured.leadId,...config.featured.storyIds,...config.sections.filter(row=>row.id!=='reviews'&&row.selection==='curated').flatMap(row=>row.storyIds||[])].filter((id):id is string=>Boolean(id)&&!known.some(article=>article.id===id)))];
  if(!ids.length)return [] as Article[];
  const result=await client.from('news_articles').select(homeArticleColumns).eq('status','published').in('id',ids);
  if(result.error)throw result.error;
  return (result.data||[]) as Article[];
}
export async function loadPinnedReviews(client:SupabaseClient,config:HomeSettings,known:HomeStory[]=[]){const ids=[...new Set(config.sections.filter(row=>row.id==='reviews'&&row.selection==='curated').flatMap(row=>row.storyIds||[]))].filter(id=>!known.some(row=>row.id===id));return (await loadHomeReviews(client,{ids})).stories}
export async function searchHomepageStories(client:SupabaseClient,search:string,page:number,category='',categories:ContentCategory[]=defaultCategories()){
  let query=client.from('news_articles').select(homeArticleColumns,{count:'exact'}).eq('status','published').order('published_at',{ascending:false,nullsFirst:false}).order('id',{ascending:false});
  const term=search.replace(/[(),.%\\]/g,' ').trim().slice(0,100);
  if(category&&category!=='quick-reads'){const row=categories.find(row=>row.slug===category);query=query.in('category',row?[...new Set([row.slug,row.name_en,row.name_te,...row.aliases])]:[category])}
  if(term)query=query.or('headline_te.ilike.%'+term+'%,headline_en.ilike.%'+term+'%');
  const result=await query.range((page-1)*20,page*20-1);if(result.error)throw result.error;
  return {articles:(result.data||[]) as Article[],count:result.count||0};
}
