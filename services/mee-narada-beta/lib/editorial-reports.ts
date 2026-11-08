import type {SupabaseClient} from '@supabase/supabase-js';
export type WriterChoice={id:string;name:string};
export type ReportArticle={id:string;slug:string;title:string;category:string|null;author_id:string|null;author_name:string;status:string;published_at:string|null;views:number;share_clicks:number;published_in_range:boolean};
export type ReportWriter={author_id:string|null;author_name:string;published_posts:number;views:number;share_clicks:number};
export type ArticleReport={started_at:string;totals:{views:number;share_clicks:number;published_posts:number};daily:{day:string;views:number;share_clicks:number}[];articles:ReportArticle[];writers:ReportWriter[];platforms:{platform:string;clicks:number}[]};
export async function loadWriters(client:SupabaseClient):Promise<WriterChoice[]>{const result=await client.rpc('studio_writers');if(result.error)throw result.error;return result.data||[]}
export async function loadArticleReport(client:SupabaseClient,start:string,end:string,author='',category=''):Promise<ArticleReport>{
  const result=await client.rpc('studio_article_report',{p_start:start,p_end:end,p_author:author||null,p_category:category||null});if(result.error)throw result.error;return result.data as ArticleReport;
}
export function reportCsv(headers:string[],rows:unknown[][]){
  const cell=(value:unknown)=>{let text=value===null||value===undefined?'':String(value);if(/^[\s]*[=+\-@\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
  return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function downloadReport(filename:string,headers:string[],rows:unknown[][]){
  const blob=new Blob([reportCsv(headers,rows)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
