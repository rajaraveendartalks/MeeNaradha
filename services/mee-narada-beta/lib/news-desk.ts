import {safeHttpUrl} from './rich-content';

export const newsTopics=[['politics','Politics'],['entertainment','Entertainment'],['sports','Sports'],['music','Music'],['influencers','Influencers']] as const;
export type NewsTopic=typeof newsTopics[number][0];
export type NewsScope='telugu'|'india';
export type NewsItem={id:string;title:string;url:string;source:string;published_at:string;topic:NewsTopic};
export type NewsOpportunity=NewsItem&{related:NewsItem[];publishers:number;signal:'High'|'Watch'|'New';reason:string};
export type NewsFeed={items:NewsItem[];fetched_at:string;provider:string};
export const topicQuery:Record<NewsTopic,string>={politics:'(politics OR government OR election)',entertainment:'(cinema OR movie OR Tollywood OR OTT)',sports:'(cricket OR sports OR badminton OR football)',music:'(singer OR music OR song OR concert)',influencers:'(influencer OR YouTuber OR "social media creator")'};
export const scopeQuery:Record<NewsScope,string>={telugu:'(Telugu OR Telangana OR "Andhra Pradesh" OR Hyderabad)',india:'India'};
export function newsQuery(topic:NewsTopic,scope:NewsScope){return topicQuery[topic]+' '+scopeQuery[scope]+' when:2d'}
export function researchUrl(topic:NewsTopic,scope:NewsScope){return 'https://news.google.com/search?'+new URLSearchParams({q:newsQuery(topic,scope),hl:'en-IN',gl:'IN',ceid:'IN:en'}).toString()}
const stopWords=new Set('the a an and or but for on in to of by with after as is are was from over at his her their has have this that its it new says said india indian telugu news video watch'.split(' '));
export const newsTokens=(text:string)=>new Set(text.toLowerCase().replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(word=>word.length>2&&!stopWords.has(word)));
function similarity(a:Set<string>,b:Set<string>){const common=[...a].filter(word=>b.has(word)).length;return common/(a.size+b.size-common||1)}
export function newsOpportunities(items:NewsItem[],now=new Date(),order:'opportunity'|'latest'='opportunity'):NewsOpportunity[]{
  const groups:{item:NewsItem;tokens:Set<string>;related:NewsItem[]}[]=[],seen=new Set<string>();
  for(const item of [...items].sort((a,b)=>b.published_at.localeCompare(a.published_at))){
    if(seen.has(item.url)||!safeHttpUrl(item.url)||!Number.isFinite(Date.parse(item.published_at)))continue;seen.add(item.url);
    const tokens=newsTokens(item.title),group=groups.find(row=>similarity(tokens,row.tokens)>=.45);
    if(group)group.related.push(item);else groups.push({item,tokens,related:[]});
  }
  const rows=groups.map(({item,related})=>{
    const publishers=new Set([item,...related].map(row=>row.source.toLowerCase())).size,age=(now.getTime()-Date.parse(item.published_at))/3600000;
    const signal:NewsOpportunity['signal']=publishers>=3&&age<=12?'High':publishers>=2&&age<=24?'Watch':'New';
    return {...item,related,publishers,signal,reason:publishers>=2?publishers+' publishers with similar headlines · compare sources before writing':'Fresh headline · verify the facts and look for a new angle'};
  });
  return rows.sort((a,b)=>order==='latest'?b.published_at.localeCompare(a.published_at):({High:3,Watch:2,New:1}[b.signal]-{High:3,Watch:2,New:1}[a.signal])||b.publishers-a.publishers||b.published_at.localeCompare(a.published_at));
}
export const topicCategory:Record<NewsTopic,string>={politics:'politics',entertainment:'movies',sports:'sports',music:'music',influencers:'influencers'};
