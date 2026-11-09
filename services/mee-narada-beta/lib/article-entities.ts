import type {SupabaseClient} from '@supabase/supabase-js';
import {articleDocument,articleText,type RichNode} from './rich-content';
export type EntityKind='movie'|'person'|'company';
export type ArticleEntity={kind:EntityKind;id:string;slug:string;name_en:string;name_te:string|null;article_aliases:string[]};
export type LinkedEntity=ArticleEntity&{href:string;label:string};
const prefixes={movie:'movie',person:'celebrity',company:'studio'} as const;
const fold=(value:string)=>value.normalize('NFC').toLowerCase();
export function entityHref(entity:Pick<ArticleEntity,'kind'|'slug'>):string|null{return prefixes[entity.kind]&&typeof entity.slug==='string'&&entity.slug&&!/[\/\\?#\u0000-\u001f\u007f]/u.test(entity.slug)?'/'+prefixes[entity.kind]+'/'+encodeURIComponent(entity.slug):null}
export function entityNames(entity:ArticleEntity){return [...new Set([entity.name_en,entity.name_te,...(entity.article_aliases||[])].filter((name):name is string=>typeof name==='string'&&name.trim().length>=2&&name.length<=160).map(name=>name.trim()))]}
const escapeRegex=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Link only unambiguous literal names, once per profile, without changing editorial text. */
export function linkArticleDocument(document:RichNode,entities:ArticleEntity[],enabled=true):{document:RichNode;links:LinkedEntity[]}{
 if(!enabled||!entities.length)return {document,links:[]};
 const claims=new Map<string,Map<string,ArticleEntity>>();
 for(const entity of entities.slice(0,300)){if(!entityHref(entity))continue;for(const name of entityNames(entity)){const key=fold(name),values=claims.get(key)||new Map<string,ArticleEntity>();values.set(entity.kind+':'+entity.id,entity);claims.set(key,values)}}
 const names:string[]=[],targets=new Map<string,ArticleEntity>();
 for(const [key,values] of claims){if(values.size!==1)continue;const entity=[...values.values()][0];targets.set(key,entity);for(const form of [key.normalize('NFC'),key.normalize('NFD')])names.push(form)}
 if(!names.length)return {document,links:[]};
 const pattern=new RegExp('(?<![\\p{L}\\p{M}\\p{N}_])(?:'+[...new Set(names)].sort((a,b)=>b.length-a.length).map(escapeRegex).join('|')+')(?![\\p{L}\\p{M}\\p{N}_])','giu'),used=new Set<string>(),links:LinkedEntity[]=[];
 function walk(node:RichNode):RichNode{
  if(['heading','codeBlock'].includes(node.type))return node;
  if(node.type!=='text')return {...node,...(node.content?{content:node.content.flatMap(child=>{const next=walk(child);return next.type==='entityTextGroup'?next.content||[]:[next]})}:{})};
  if((node.marks||[]).some(mark=>mark.type==='link'||mark.type==='code'))return node;
  const text=node.text||'',parts:RichNode[]=[];let offset=0;pattern.lastIndex=0;
  for(const match of text.matchAll(pattern)){
   if(links.length>=12)break;const entity=targets.get(fold(match[0]));if(!entity)continue;const identity=entity.kind+':'+entity.id,index=match.index!,href=entityHref(entity)!;
   if(used.has(identity))continue;
   const left=text.slice(0,index).match(/\S*$/)?.[0]||'',right=text.slice(index+match[0].length).match(/^\S*/)?.[0]||'';if(/https?:\/\/|www\.|@/i.test(left+match[0]+right))continue;
   if(index>offset)parts.push({...node,text:text.slice(offset,index)});
   parts.push({...node,text:match[0],marks:[...(node.marks||[]),{type:'entityLink',attrs:{href,label:entity.name_te||entity.name_en}}]});offset=index+match[0].length;used.add(identity);links.push({...entity,href,label:entity.name_te||entity.name_en});
  }
  if(!parts.length)return node;if(offset<text.length)parts.push({...node,text:text.slice(offset)});return {type:'entityTextGroup',content:parts};
 }
 return {document:walk(document),links};
}
export function articleLinks(value:string,entities:ArticleEntity[],enabled=true){return linkArticleDocument(articleDocument(value),entities,enabled).links}
export async function loadArticleEntities(client:SupabaseClient,text:string):Promise<ArticleEntity[]>{if(!text.trim())return [];const {data,error}=await client.rpc('article_entity_candidates',{p_text:text.normalize('NFC').slice(0,200_000)});if(error)throw error;return data?.length>=300?[]:(data||[]) as ArticleEntity[]}
export type EntityArticle={id:string;slug:string;headline_en:string|null;headline_te:string|null;hero_image_url:string|null;published_at:string|null;body_te:string|null;body_en:string|null};
export async function loadEntityArticles(client:SupabaseClient,entity:ArticleEntity):Promise<EntityArticle[]>{const {data,error}=await client.rpc('entity_related_articles',{p_kind:entity.kind,p_entity_id:entity.id});if(error)throw error;return ((data||[]) as EntityArticle[]).filter(row=>articleLinks(articleText(row.body_te||row.body_en||'')+'\n\n'+(row.headline_te||row.headline_en||''),[entity]).length>0).slice(0,12)}
export function entityCandidateText(headline:string,body:string){return headline+'\n'+articleText(body)}
