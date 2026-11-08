import type {SupabaseClient} from '@supabase/supabase-js';

export const teluguFonts = [
  {id:'system',name:'Current website font',family:'system-ui, "Noto Sans Telugu", sans-serif'},
  {id:'noto-sans-telugu',name:'Noto Sans Telugu',family:'"MN Noto Sans Telugu", sans-serif'},
  {id:'noto-serif-telugu',name:'Noto Serif Telugu',family:'"MN Noto Serif Telugu", serif'},
  {id:'mandali',name:'Mandali',family:'"MN Mandali", sans-serif'},
  {id:'ramabhadra',name:'Ramabhadra',family:'"MN Ramabhadra", sans-serif'},
  {id:'ntr',name:'NTR',family:'"MN NTR", sans-serif'},
  {id:'hind-guntur',name:'Hind Guntur',family:'"MN Hind Guntur", sans-serif'},
] as const;
export type FontId=typeof teluguFonts[number]['id'];
export type Typography={headline:FontId;body:FontId;bodySize:number;lineHeight:number};
export type TypographyRecord={id:string;config:Typography;revision:number;updated_at:string};
export const defaultTypography:Typography={headline:'system',body:'system',bodySize:18,lineHeight:1.95};
export const fontFamily=(id:unknown)=>teluguFonts.find(font=>font.id===id)?.family||teluguFonts[0].family;
export function normalizeTypography(value:unknown):Typography{
  const raw=(value&&typeof value==='object'?value:{}) as Partial<Typography>;
  const font=(id:unknown):FontId=>teluguFonts.find(font=>font.id===id)?.id||'system';
  return {headline:font(raw.headline),body:font(raw.body),bodySize:typeof raw.bodySize==='number'&&raw.bodySize>=16&&raw.bodySize<=24?raw.bodySize:18,lineHeight:typeof raw.lineHeight==='number'&&raw.lineHeight>=1.6&&raw.lineHeight<=2.4?raw.lineHeight:1.95};
}
export function typographyVariables(value:Typography){return {'--news-heading-font':fontFamily(value.headline),'--news-body-font':fontFamily(value.body),'--news-body-size':value.bodySize+'px','--news-line-height':String(value.lineHeight)}}
export async function loadTypography(client:SupabaseClient|null):Promise<TypographyRecord>{
  const fallback={id:'website',config:{...defaultTypography},revision:0,updated_at:''};
  if(!client)return fallback;
  const result=await client.from('site_typography').select('id,config,revision,updated_at').eq('id','website').maybeSingle();
  if(result.error)throw result.error;
  return result.data?{...result.data,config:normalizeTypography(result.data.config)}:fallback;
}
export async function saveTypography(client:SupabaseClient,config:Typography,revision:number):Promise<TypographyRecord>{
  const result=await client.from('site_typography').update({config:normalizeTypography(config)}).eq('id','website').eq('revision',revision).select('id,config,revision,updated_at').maybeSingle();
  if(result.error)throw result.error;if(!result.data)throw Error('Fonts changed in another session. Reload before saving.');
  return {...result.data,config:normalizeTypography(result.data.config)};
}
