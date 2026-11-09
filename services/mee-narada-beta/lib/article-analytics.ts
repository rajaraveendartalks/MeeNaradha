export const sharePlatforms=['facebook','x','instagram','whatsapp','reddit','telegram','linkedin','pinterest','email','copy','more'] as const;
export type AnalyticsPlatform=typeof sharePlatforms[number];
let readerId:string|undefined;
function identity(){
  if(readerId)return readerId;
  try{const stored=localStorage.getItem('mnr-reader-id-v1');if(stored&&/^[a-f0-9-]{36}$/i.test(stored))return readerId=stored;readerId=crypto.randomUUID();localStorage.setItem('mnr-reader-id-v1',readerId);return readerId}catch{return readerId=crypto.randomUUID()}
}
export function analyticsAllowed(){return typeof navigator!=='undefined'&&navigator.doNotTrack!=='1'&&!(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl&&!/bot|spider|crawler|headless|preview/i.test(navigator.userAgent)}
export async function recordArticleEvent(articleId:string,kind:'view'|'share_click',platform:AnalyticsPlatform|'none'='none'){
  if(!analyticsAllowed())return;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return;
  // Editorial previews and signed-in browsing are excluded from audience counts.
  try{if(localStorage.getItem('sb-'+new URL(url).hostname.split('.')[0]+'-auth-token'))return}catch{}
  try{await fetch(url+'/functions/v1/article-analytics',{method:'POST',headers:{'Content-Type':'application/json',apikey:key},credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,body:JSON.stringify({article_id:articleId,kind,platform,visitor_id:identity()})})}catch{/* Sharing and reading must still work when analytics is blocked. */}
}
