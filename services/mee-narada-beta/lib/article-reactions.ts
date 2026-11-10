import type {SupabaseClient} from '@supabase/supabase-js';
export const reactionKinds=['like','heart','angry','lol','kiss','egg'] as const;
export type ReactionKind=typeof reactionKinds[number];
export const reactionDetails:Record<ReactionKind,{emoji:string;label:string;telugu:string}>={like:{emoji:'👍',label:'Like',telugu:'నచ్చింది'},heart:{emoji:'❤️',label:'Touched',telugu:'మనసును తాకింది'},angry:{emoji:'😡',label:'Angry',telugu:'కోపం వచ్చింది'},lol:{emoji:'😂',label:'LOL',telugu:'నవ్వొచ్చింది'},kiss:{emoji:'😘',label:'Kiss',telugu:'ముద్దుగా ఉంది'},egg:{emoji:'🥚',label:'Throw an egg',telugu:'అసహ్యంగా ఉంది'}};
export type ReactionCounts=Record<ReactionKind,number>;
export const emptyReactionCounts=():ReactionCounts=>({like:0,heart:0,angry:0,lol:0,kiss:0,egg:0});
export type ReactionState={enabled:boolean;allowed:ReactionKind[];counts:ReactionCounts;total:number;selected:ReactionKind|null;version:number;revision:number};
export type ReactionOperation={id:string;reaction:ReactionKind|null;version:number};
export class ReactionRequestError extends Error{constructor(message:string,public status=503,public current?:ReactionState){super(message)}}
const validKind=(value:unknown):value is ReactionKind=>typeof value==='string'&&reactionKinds.includes(value as ReactionKind);
const count=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:0;
export function normalizeReactionState(value:unknown):ReactionState{
 if(!value||typeof value!=='object')throw Error('Reaction counts are unavailable.');const raw=value as Record<string,unknown>;if(typeof raw.enabled!=='boolean'||!Array.isArray(raw.allowed)||!raw.counts||typeof raw.counts!=='object')throw Error('Reaction counts are unavailable.');
 const allowed=reactionKinds.filter(kind=>(raw.allowed as unknown[]).includes(kind)),source=raw.counts as Record<string,unknown>,counts=emptyReactionCounts();for(const kind of reactionKinds)counts[kind]=allowed.includes(kind)?count(source[kind]):0;
 return {enabled:raw.enabled,allowed,counts,total:reactionKinds.reduce((total,kind)=>total+counts[kind],0),selected:validKind(raw.selected)?raw.selected:null,version:count(raw.version),revision:count(raw.revision)};
}
export const reactionBrowserKey='mnr_reactions_browser_v1';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
let temporaryBrowserId:string|null=null;
/** A browser identifier is created only when the reader chooses to react. */
export function reactionBrowserId(create=false):string|null{
 if(typeof window==='undefined')return null;
 try{const existing=window.localStorage.getItem(reactionBrowserKey);if(existing&&uuid.test(existing))return existing}catch{/* Private browsing can use the current page session. */}
 if(temporaryBrowserId)return temporaryBrowserId;if(!create)return null;const id=crypto.randomUUID();try{window.localStorage.setItem(reactionBrowserKey,id)}catch{temporaryBrowserId=id}return id;
}
export async function requestReactions(articleId:string,browserId:string|null,operation?:ReactionOperation,signal?:AbortSignal):Promise<ReactionState>{
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!base||!key)throw new ReactionRequestError('Reactions are temporarily unavailable.');
 const body={action:operation?'react':'read',article_id:articleId,browser_id:browserId,...(operation?{reaction:operation.reaction,operation_id:operation.id,version:operation.version}:{})};
 let response:Response;try{response=await fetch(base.replace(/\/$/,'')+'/functions/v1/article-reactions',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify(body),signal:signal||AbortSignal.timeout(15000)})}catch{throw new ReactionRequestError(operation?'We could not confirm your reaction. Retry to check and save the same choice.':'Reaction counts could not be loaded. Please try again.')}
 const result=await response.json().catch(()=>({}));if(!response.ok){let current:ReactionState|undefined;try{if(result.state)current=normalizeReactionState(result.state)}catch{}throw new ReactionRequestError(typeof result.error==='string'?result.error:'Reactions are temporarily unavailable.',response.status,current)}return normalizeReactionState(result);
}
export type ReactionSettings={id:'website';enabled:boolean;kiss_enabled:boolean;kiss_categories:string[];revision:number;updated_at:string};
export async function loadReactionSettings(client:SupabaseClient):Promise<ReactionSettings>{const result=await client.from('site_reaction_settings').select('*').eq('id','website').single();if(result.error)throw result.error;return result.data}
export async function saveReactionSettings(client:SupabaseClient,draft:ReactionSettings,original:ReactionSettings):Promise<ReactionSettings>{
 if(typeof draft.enabled!=='boolean'||typeof draft.kiss_enabled!=='boolean'||draft.kiss_categories.length>30||new Set(draft.kiss_categories).size!==draft.kiss_categories.length||draft.kiss_categories.some(value=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)))throw Error('Choose valid reaction settings and categories.');
 const result=await client.from('site_reaction_settings').update({enabled:draft.enabled,kiss_enabled:draft.kiss_enabled,kiss_categories:draft.kiss_categories}).eq('id','website').eq('revision',original.revision).select().maybeSingle();if(result.error)throw result.error;if(!result.data)throw Error('Reaction settings changed in another session. Reload before saving.');return result.data;
}
export type ReactionReportRow={id:string;slug:string;title:string;category:string;author_id:string|null;counts:ReactionCounts;total:number;views:number;live_total:number};
export type ReactionReport={totals:{total:number;views:number;live_total:number;counts:ReactionCounts};articles:ReactionReportRow[];article_count:number;categories:{category:string;total:number}[];daily:{day:string;total:number}[];writers:{author_id:string|null;total:number;views:number}[]};
export async function loadReactionReport(client:SupabaseClient,start:string,end:string,category='',author=''):Promise<ReactionReport>{const result=await client.rpc('studio_reaction_report',{p_start:start,p_end:end,p_category:category||null,p_author:author||null});if(result.error)throw result.error;return result.data}
export const reactionRate=(reactions:number,views:number)=>views>0?Math.round(reactions/views*1000)/10:0;
