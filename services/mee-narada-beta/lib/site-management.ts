import type {SupabaseClient} from '@supabase/supabase-js';

export type ContentCategory={slug:string;name_en:string;name_te:string;description:string;aliases:string[];is_active:boolean;sort_order:number;revision:number};
const seeds=[['movies','Movies','సినిమాలు'],['ott','OTT','OTT'],['celebrities','Celebrities','సెలబ్రిటీలు'],['box-office','Box Office','బాక్సాఫీస్'],['technology','Technology & VFX','టెక్నాలజీ'],['politics','Politics','రాజకీయాలు'],['events','Events','ఈవెంట్స్'],['interviews','Interviews','ఇంటర్వ్యూలు'],['industry','Industry','పరిశ్రమ'],['other','Other','ఇతర వార్తలు']];
export const defaultCategories=():ContentCategory[]=>seeds.map(([slug,name_en,name_te],index)=>({slug,name_en,name_te,description:'',aliases:[],is_active:true,sort_order:index,revision:0}));
export const categoryLabel=(category:ContentCategory,english=false)=>english?category.name_en:category.name_te||category.name_en;
export const categoryValues=(category:Pick<ContentCategory,'slug'|'aliases'>)=>[category.slug,...category.aliases];
export function findCategory(categories:ContentCategory[],value:string|null){return categories.find(category=>categoryValues(category).some(alias=>alias.toLowerCase()===(value||'').toLowerCase()))}
export const categorySlug=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64);
const reserved=new Set(['latest','videos','galleries','short-films','all','admin']);
export function categoryPayload(category:ContentCategory){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.slug)||category.slug.length>64||reserved.has(category.slug))throw Error('Use an English category slug with letters, numbers and hyphens.');
  if(!category.name_en.trim()||category.name_en.trim().length>80||category.name_te.length>100||category.description.length>500)throw Error('Add a category name and keep the description under 500 characters.');
  if(!Number.isInteger(category.sort_order)||category.sort_order<0||category.sort_order>10000)throw Error('The category order must be a number from 0 to 10000.');
  return {slug:category.slug,name_en:category.name_en.trim(),name_te:category.name_te.trim(),description:category.description.trim(),is_active:category.is_active,sort_order:category.sort_order};
}
export async function loadCategories(client:SupabaseClient,fallback=true):Promise<ContentCategory[]>{
  const result=await client.from('content_categories').select('slug,name_en,name_te,description,aliases,is_active,sort_order,revision').order('sort_order').order('name_en');
  if(result.error){if(!fallback)throw result.error;console.error('Categories unavailable',result.error.message);return defaultCategories()}
  return result.data?.length?result.data as ContentCategory[]:fallback?defaultCategories():[];
}
export async function saveCategory(client:SupabaseClient,category:ContentCategory,existing=false){
  const payload=categoryPayload(category);
  const result=existing?await client.from('content_categories').update(payload).eq('slug',category.slug).eq('revision',category.revision).select().maybeSingle():await client.from('content_categories').insert(payload).select().single();
  if(result.error?.code==='23505')throw Error('This category slug is already in use.');if(result.error)throw result.error;
  if(!result.data)throw Error('This category changed in another session. Reload it before saving.');return result.data as ContentCategory;
}
export type MenuLocation='main'|'categories'|'footer';
export const menuLocations=[['main','Main navigation'],['categories','Category bar'],['footer','Footer links']] as const;
export type MenuItem={id:string;label:string;kind:'home'|'category'|'videos'|'galleries'|'custom';category:string;url:string;enabled:boolean;newTab:boolean};
export type NavigationConfig={version:1;menus:Record<MenuLocation,MenuItem[]>};
const item=(id:string,label:string,kind:MenuItem['kind'],category=''):MenuItem=>({id,label,kind,category,url:'',enabled:true,newTab:false});
export function defaultNavigation():NavigationConfig{return {version:1,menus:{main:[item('main-home','హోమ్','home'),item('main-movies','సినిమాలు','category','movies'),item('main-ott','OTT','category','ott'),item('main-galleries','ఫోటోలు','galleries'),item('main-videos','వీడియోలు','videos')],categories:[item('category-home','అన్ని వార్తలు','home'),item('category-movies','సినిమాలు','category','movies'),item('category-ott','OTT','category','ott'),item('category-celebrities','సెలబ్రిటీలు','category','celebrities'),item('category-box-office','బాక్సాఫీస్','category','box-office'),item('category-technology','టెక్నాలజీ','category','technology'),item('category-politics','రాజకీయాలు','category','politics'),{...item('category-short-films','షార్ట్ ఫిల్మ్స్','custom'),url:'/videos?category=short_film'},item('category-galleries','ఫోటోలు','galleries')],footer:[]}}}
export function safeMenuUrl(value:string):string|null{
  const input=value.trim();if(!input||/[\u0000-\u0020\\]/.test(input))return null;
  if(input.startsWith('/')&&!input.startsWith('//')){try{const decoded=decodeURIComponent(input);if(decoded.startsWith('//')||/[\\\u0000-\u001f]/.test(decoded))return null;return input}catch{return null}}
  try{const url=new URL(input);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null}catch{return null}
}
export function menuHref(value:MenuItem){return value.kind==='home'?'/':value.kind==='videos'?'/videos':value.kind==='galleries'?'/gallery':value.kind==='category'&&/^[a-z0-9-]{1,64}$/.test(value.category)?'/?section='+encodeURIComponent(value.category):value.kind==='custom'?safeMenuUrl(value.url):null}
export function normalizeNavigation(value:unknown):NavigationConfig{
  if(!value||typeof value!=='object'||(value as NavigationConfig).version!==1)return defaultNavigation();
  const raw=value as NavigationConfig,defaults=defaultNavigation(),menus={} as NavigationConfig['menus'];
  for(const [location] of menuLocations){const seen=new Set<string>();menus[location]=Array.isArray(raw.menus?.[location])?raw.menus[location].slice(0,30).flatMap(entry=>{
    if(!entry||typeof entry.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(entry.id)||seen.has(entry.id)||typeof entry.label!=='string'||!entry.label.trim()||!['home','videos','galleries','category','custom'].includes(entry.kind))return [];
    const next:MenuItem={id:entry.id,label:entry.label.trim().slice(0,80),kind:entry.kind,category:typeof entry.category==='string'?entry.category:'',url:typeof entry.url==='string'?entry.url:'',enabled:entry.enabled!==false,newTab:entry.newTab===true};if(!menuHref(next))return [];seen.add(entry.id);return [next];
  }):defaults.menus[location]}
  return {version:1,menus};
}
export function validateNavigation(config:NavigationConfig){
  for(const [location] of menuLocations){const rows=config.menus[location];if(rows.length>30||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Use up to 30 different links in each menu.');for(const row of rows)if(!row.label.trim()||row.label.length>80||!menuHref(row))throw Error('Each menu item needs a label and a valid category, page or URL.')}
  return normalizeNavigation(config);
}
export type NavigationRecord={id:'draft'|'published';config:NavigationConfig;revision:number;updated_at:string};
export type NavigationState={draft:NavigationRecord;published:NavigationRecord};
export async function loadPublishedNavigation(client:SupabaseClient){const result=await client.from('site_navigation').select('config').eq('id','published').maybeSingle();if(result.error)console.error('Menus unavailable',result.error.message);return normalizeNavigation(result.data?.config)}
export async function loadNavigationState(client:SupabaseClient):Promise<NavigationState>{const result=await client.from('site_navigation').select('id,config,revision,updated_at').in('id',['draft','published']);if(result.error)throw result.error;const draft=result.data?.find(row=>row.id==='draft'),published=result.data?.find(row=>row.id==='published');if(!draft||!published)throw Error('Menu settings are unavailable.');return {draft:{...draft,config:normalizeNavigation(draft.config)},published:{...published,config:normalizeNavigation(published.config)}}}
export async function saveNavigation(client:SupabaseClient,config:NavigationConfig,state:NavigationState,publish=false):Promise<NavigationState>{const result=await client.rpc('save_site_navigation',{p_config:validateNavigation(config),p_draft_revision:state.draft.revision,p_published_revision:state.published.revision,p_publish:publish});if(result.error?.code==='40001')throw Error('Menus changed in another session. Reload the latest version before saving.');if(result.error)throw result.error;if(!result.data?.draft||!result.data?.published)throw Error('Menu settings were not saved.');return result.data as NavigationState}
export type CmsRole='admin'|'editor'|'reviewer'|'user';
export const roleLabels:Record<CmsRole,string>={admin:'Administrator',editor:'Editor',reviewer:'Reviewer',user:'No CMS access'};
export type ManagedUser={id:string;email:string;name:string;role:CmsRole;confirmed:boolean;created_at:string;last_sign_in_at:string|null};
export async function loadUsers(client:SupabaseClient,search:string,page:number):Promise<{items:ManagedUser[];count:number}>{const result=await client.rpc('studio_list_users',{p_search:search.trim().slice(0,100),p_page:page});if(result.error)throw result.error;return result.data}
export async function setUserRole(client:SupabaseClient,id:string,role:CmsRole){const result=await client.rpc('studio_set_user_role',{p_user_id:id,p_role:role});if(result.error)throw result.error;return result.data}
export async function inviteUser(client:SupabaseClient,email:string,name:string,role:'admin'|'editor'){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||email.length>254)throw Error('Enter a valid email address.');
  const result=await client.functions.invoke('studio-users',{body:{action:'invite',email:email.trim(),name:name.trim().slice(0,100),role}});
  if(result.error){const context=result.error.context;let message='The invitation could not be sent. Please try again.';if(context instanceof Response)try{const body=await context.json();if(body.error)message=body.error}catch{}throw Error(message)}
  if(result.data?.error)throw Error(result.data.error);return result.data;
}
export function authLinkRedirect(pathname:string,hash:string){const params=new URLSearchParams(hash.replace(/^#/,''));return !pathname.startsWith('/admin')&&['invite','recovery'].includes(params.get('type')||'')&&params.has('access_token')?'/admin'+hash:null}
