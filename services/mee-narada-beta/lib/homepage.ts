import type {Article} from './db';
import {defaultCategories,findCategory,categoryLabel,type ContentCategory} from './site-management';

export const homePresets=[['lead-headlines','Lead + Headlines'],['compact','Compact Rows'],['lead-cards','Lead + Cards'],['feature-rows','Feature + Compact Rows'],['review-showcase','Review Showcase'],['quick-reads','Quick Reads']] as const;
export type HomePreset=typeof homePresets[number][0];
export const presetsForSection=(id:string)=>homePresets.filter(([key])=>id==='reviews'?key==='review-showcase':id==='videos'?['lead-headlines','compact','lead-cards'].includes(key):key!=='review-showcase');
export const presetDescriptions:Record<HomePreset,string>={'lead-headlines':'A lead image with supporting headlines.','compact':'Compact rows of stories.','lead-cards':'A lead story and supporting cards.','feature-rows':'A wide lead image and summary, supporting headlines and compact rows.','review-showcase':'One featured review and smaller review cards, using saved editorial ratings.','quick-reads':'A reader-controlled story card in the desktop sidebar; swipe or use Previous / Next.'};
export type HomeStory=Article&{content_kind?:'review';rating?:number|null};
export const homeStoryHref=(story:HomeStory)=>'/'+(story.content_kind==='review'?'review':'article')+'/'+encodeURIComponent(story.slug);
export const homeSections=[
  {id:'videos',name:'Videos',title:'వీడియోలు',limit:6,preset:'lead-headlines'},
  {id:'movies',name:'Movies',title:'సినిమా వార్తలు',limit:10,preset:'lead-cards'},
  {id:'reviews',name:'Reviews',title:'సినిమా రివ్యూలు',limit:7,preset:'review-showcase'},
  {id:'ott',name:'OTT',title:'OTT అప్‌డేట్స్',limit:5,preset:'lead-headlines'},
  {id:'celebrities',name:'Celebrities',title:'సెలబ్రిటీ వార్తలు',limit:10,preset:'lead-cards'},
  {id:'box-office',name:'Box Office',title:'బాక్సాఫీస్',limit:12,preset:'compact'},
  {id:'technology',name:'Technology',title:'టెక్నాలజీ & VFX',limit:12,preset:'compact'},
  {id:'politics',name:'Politics',title:'రాజకీయాలు',limit:5,preset:'lead-headlines'},
  {id:'quick-reads',name:'Quick Reads',title:'ఫాస్ట్ ఫార్వర్డ్',limit:5,preset:'quick-reads'},
  {id:'galleries',name:'Photo Galleries',title:'ఫోటో గ్యాలరీలు',limit:3,preset:'lead-cards'}
] as const;
export type HomeSectionId=string;
export type HomeSection={id:HomeSectionId;title:string;enabled:boolean;limit:number;preset:HomePreset;selection?:'automatic'|'curated';storyIds?:string[]};
export type HomeSettings={version:1;intro:{eyebrow:string;title:string;caption:string};ticker:{enabled:boolean;label:string;text:string};featured:{enabled:boolean;title:string;leadId:string|null;storyIds:string[]};sections:HomeSection[]};
export const homeCategories=[{key:'latest',label:'అన్ని వార్తలు'},{key:'movies',label:'సినిమాలు'},{key:'ott',label:'OTT'},{key:'celebrities',label:'సెలబ్రిటీలు'},{key:'box-office',label:'బాక్సాఫీస్'},{key:'technology',label:'టెక్నాలజీ'},{key:'politics',label:'రాజకీయాలు'},{key:'short-films',label:'షార్ట్ ఫిల్మ్స్'},{key:'galleries',label:'ఫోటోలు'}];
const categoryMatches:Partial<Record<HomeSectionId,RegExp>>={movies:/movie|cinema|film/i,ott:/ott/i,celebrities:/celebrit|actor|star/i,'box-office':/box[ _-]?office/i,technology:/tech|vfx/i,politics:/politic/i};
export function matchesHomeCategory(category:string|null,id:HomeSectionId,categories:ContentCategory[]=defaultCategories()){const known=findCategory(categories,category);return known?known.slug===id:categoryMatches[id]?.test(category||'')||(category||'').toLowerCase()===id}
export function withCategorySections(settings:HomeSettings,categories:ContentCategory[]):HomeSettings{return {...settings,sections:[...settings.sections,...categories.filter(category=>!settings.sections.some(row=>row.id===category.slug)).slice(0,Math.max(0,64-settings.sections.length)).map(category=>({id:category.slug,title:categoryLabel(category).slice(0,80),enabled:false,limit:10,preset:'lead-cards' as HomePreset}))]}}
export function defaultHomeSettings():HomeSettings{return {version:1,intro:{eyebrow:'మీ తెలుగు ఎంటర్‌టైన్‌మెంట్ హబ్',title:'తాజా వార్తలు',caption:'సినిమా ప్రపంచం మీ ముందుకు'},ticker:{enabled:true,label:'తాజా అప్‌డేట్స్',text:'తెలుగు సినిమా • OTT • సెలబ్రిటీలు • వినోద వార్తలు'},featured:{enabled:true,title:'ట్రెండింగ్ వార్తలు',leadId:null,storyIds:[]},sections:homeSections.map(section=>({id:section.id,title:section.title,enabled:!['reviews','quick-reads'].includes(section.id),limit:section.limit,preset:section.preset,selection:'automatic',storyIds:[]}))}}
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown,fallback:string,max=100)=>typeof value==='string'&&value.trim()?value.trim().slice(0,max):fallback;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const preset=(value:unknown,fallback:HomePreset)=>homePresets.some(([key])=>key===value)?value as HomePreset:fallback;
export const maxHomeItems=(id:HomeSectionId)=>['videos','galleries','reviews','quick-reads'].includes(id)?12:24;
export function normalizeHomeSettings(value:unknown):HomeSettings{
  const defaults=defaultHomeSettings(),raw=object(value);
  if(raw.version!==1)return defaults;
  const intro=object(raw.intro),ticker=object(raw.ticker),featured=object(raw.featured),seen=new Set<string>(),sections:HomeSection[]=[];
  for(const entry of (Array.isArray(raw.sections)?raw.sections:[]).slice(0,64)){const section=object(entry),known=defaults.sections.find(row=>row.id===section.id),base=known||(typeof section.id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section.id)&&section.id.length<=64?{id:section.id,title:section.id,enabled:false,limit:10,preset:'lead-cards' as HomePreset}:null);if(!base||seen.has(base.id))continue;seen.add(base.id);const selected=preset(section.preset,base.preset),allowed=presetsForSection(base.id).some(([key])=>key===selected),ids=[...new Set((Array.isArray(section.storyIds)?section.storyIds:[]).filter((id):id is string=>typeof id==='string'&&uuid.test(id)))].slice(0,maxHomeItems(base.id));sections.push({...base,title:text(section.title,base.title,80),enabled:typeof section.enabled==='boolean'?section.enabled:base.enabled,limit:typeof section.limit==='number'&&Number.isInteger(section.limit)?Math.max(1,Math.min(maxHomeItems(base.id),section.limit)):base.limit,preset:allowed?selected:base.preset,selection:section.selection==='curated'?'curated':'automatic',storyIds:ids})}
  for(const base of defaults.sections)if(!seen.has(base.id))sections.push(base);
  const leadId=typeof featured.leadId==='string'&&uuid.test(featured.leadId)?featured.leadId:null;
  return {version:1,intro:{eyebrow:text(intro.eyebrow,defaults.intro.eyebrow),title:text(intro.title,defaults.intro.title),caption:text(intro.caption,defaults.intro.caption)},ticker:{enabled:typeof ticker.enabled==='boolean'?ticker.enabled:true,label:text(ticker.label,defaults.ticker.label,50),text:text(ticker.text,defaults.ticker.text,180)},featured:{enabled:typeof featured.enabled==='boolean'?featured.enabled:true,title:text(featured.title,defaults.featured.title,80),leadId,storyIds:[...new Set((Array.isArray(featured.storyIds)?featured.storyIds:[]).filter((id):id is string=>typeof id==='string'&&uuid.test(id)&&id!==leadId))].slice(0,4)},sections};
}
export function validateHomeSettings(settings:HomeSettings){
  for(const [label,value,max] of [['Homepage title',settings.intro.title,100],['Eyebrow',settings.intro.eyebrow,100],['Caption',settings.intro.caption,100],['Ticker label',settings.ticker.label,50],['Ticker text',settings.ticker.text,180],['Trending title',settings.featured.title,80]] as const){if(!value.trim()||value.length>max)throw Error(label+' must contain 1–'+max+' characters.')}
  if(settings.sections.length>64||new Set(settings.sections.map(row=>row.id)).size!==settings.sections.length||homeSections.some(base=>!settings.sections.some(row=>row.id===base.id)))throw Error('Keep each homepage section once.');
  for(const row of settings.sections){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id)||row.id.length>64||!presetsForSection(row.id).some(([id])=>id===row.preset)||!row.title.trim()||row.title.length>80||!Number.isInteger(row.limit)||row.limit<1||row.limit>maxHomeItems(row.id))throw Error('Check the title, layout and item count for each section.');const ids=row.storyIds||[];if(row.selection!==undefined&&!['automatic','curated'].includes(row.selection)||ids.length>maxHomeItems(row.id)||new Set(ids).size!==ids.length||ids.some(id=>!uuid.test(id))||['videos','galleries'].includes(row.id)&&row.selection==='curated')throw Error('Choose valid, different published stories for each news section.')}
  if(settings.featured.leadId&&!uuid.test(settings.featured.leadId))throw Error('Choose a published lead story.');
  if(settings.featured.storyIds.length>4||settings.featured.storyIds.some(id=>!uuid.test(id)||id===settings.featured.leadId)||new Set(settings.featured.storyIds).size!==settings.featured.storyIds.length)throw Error('Choose up to four different trending stories.');
  return normalizeHomeSettings(settings);
}
/** Curated lists never silently fill with stories the editor did not select. */
export function sectionStories(section:HomeSection,news:HomeStory[],pinned:HomeStory[]=[],categories:ContentCategory[]=defaultCategories()):HomeStory[]{
 const matches=(story:HomeStory)=>story.status==='published'&&(section.id==='reviews'?story.content_kind==='review':story.content_kind!=='review'&&(section.id==='quick-reads'||matchesHomeCategory(story.category,section.id,categories)));
 const byId=new Map([...news,...pinned].filter(matches).map(story=>[story.id,story]));
 return section.selection==='curated'?(section.storyIds||[]).flatMap(id=>{const story=byId.get(id);return story?[story]:[]}).slice(0,section.limit):[...new Map(news.filter(matches).map(story=>[story.id,story])).values()].slice(0,section.limit);
}
export function featuredStories(settings:HomeSettings,news:Article[],pinned:Article[]=[]){
  const pool=[...news,...pinned].filter(article=>article.status==='published'),byId=new Map(pool.map(article=>[article.id,article]));
  const lead=(settings.featured.leadId?byId.get(settings.featured.leadId):undefined)||news.find(article=>article.status==='published');
  const seen=new Set(lead?[lead.id]:[]),stories:Article[]=[];
  for(const id of settings.featured.storyIds){const article=byId.get(id);if(article&&!seen.has(id)){seen.add(id);stories.push(article)}}
  for(const article of news){if(stories.length===4)break;if(article.status==='published'&&!seen.has(article.id)){seen.add(article.id);stories.push(article)}}
  return {lead,stories};
}
