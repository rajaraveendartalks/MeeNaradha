import {safeHttpUrl} from './rich-content';
export type SharePlatform='facebook'|'x'|'instagram'|'whatsapp'|'reddit'|'telegram'|'linkedin'|'pinterest';
export type ArticleShareLink={platform:Exclude<SharePlatform,'instagram'>;label:string;href:string};
const withQuery=(base:string,values:Record<string,string>)=>base+'?'+new URLSearchParams(values).toString().replace(/\+/g,'%20');
export function articleShareData(title:string,url:string,image?:string|null){
  const canonical=safeHttpUrl(url);if(!canonical)throw Error('Article sharing requires a valid public URL.');
  const headline=title.replace(/\s+/g,' ').trim()||'Mee Narada article',text=headline+' – Mee Narada',media=image?safeHttpUrl(image):null;
  const links:ArticleShareLink[]=[
    {platform:'facebook',label:'Facebook',href:withQuery('https://www.facebook.com/sharer/sharer.php',{u:canonical})},
    {platform:'x',label:'X',href:withQuery('https://twitter.com/intent/tweet',{text,url:canonical})},
    {platform:'whatsapp',label:'WhatsApp',href:withQuery('https://wa.me/',{text:text+'\n'+canonical})},
    {platform:'reddit',label:'Reddit',href:withQuery('https://www.reddit.com/submit',{url:canonical,title:headline})},
    {platform:'telegram',label:'Telegram',href:withQuery('https://t.me/share/url',{url:canonical,text})},
    {platform:'linkedin',label:'LinkedIn',href:withQuery('https://www.linkedin.com/sharing/share-offsite/',{url:canonical})}
  ];
  if(media)links.push({platform:'pinterest',label:'Pinterest',href:withQuery('https://www.pinterest.com/pin/create/button/',{url:canonical,media,description:text})});
  return {url:canonical,title:headline,text,links,email:'mailto:?subject='+encodeURIComponent(text)+'&body='+encodeURIComponent(text+'\n\n'+canonical)};
}
