import {articleDocument,preferredArticleBody,safeColor,youtubeId,type RichNode} from '../../mee-narada-beta/lib/rich-content';
export {preferredArticleBody};
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const https=(raw:unknown)=>{try{const u=new URL(String(raw));return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
export function html(value:string){
 function node(n:RichNode):string{let text=(n.content||[]).map(node).join('');if(n.type==='text'){text=esc(n.text);for(const m of n.marks||[]){if(m.type==='bold')text='<strong>'+text+'</strong>';else if(m.type==='italic')text='<em>'+text+'</em>';else if(m.type==='underline')text='<u>'+text+'</u>';else if(m.type==='strike')text='<s>'+text+'</s>';else if(m.type==='code')text='<code>'+text+'</code>';else if(m.type==='link'){const u=https(m.attrs?.href);if(u)text='<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+text+'</a>'}else if(m.type==='textStyle'){const color=safeColor(m.attrs?.color);if(color)text='<span style="color:'+esc(color)+'">'+text+'</span>'}}return text}
  const tags:Record<string,string>={doc:'div',paragraph:'p',heading:n.attrs?.level===3?'h3':'h2',blockquote:'blockquote',bulletList:'ul',orderedList:'ol',listItem:'li',codeBlock:'pre'};if(tags[n.type])return '<'+tags[n.type]+'>'+text+'</'+tags[n.type]+'>';if(n.type==='hardBreak')return '<br>';if(n.type==='horizontalRule')return '<hr>';if(n.type==='image'){const src=https(n.attrs?.src);return src?'<figure><img src="'+esc(src)+'" alt="'+esc(n.attrs?.alt)+'" loading="lazy"></figure>':''}if(n.type==='youtube'){const id=youtubeId(n.attrs?.src);return id?'<div class="rich-video"><iframe src="https://www.youtube-nocookie.com/embed/'+id+'" title="Article video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>':''}return text;
 }
 return node(articleDocument(value||''));
}
