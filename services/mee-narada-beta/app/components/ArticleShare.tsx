'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {articleShareData,type SharePlatform} from '../../lib/article-sharing';
import {ShareIcon} from './ShareIcons';

type Notice={text:string;manual:boolean;instagram:boolean};
export default function ArticleShare({title,url,image}:{title:string;url:string;image?:string|null}){
  const data=articleShareData(title,url,image),heading=useId(),[notice,setNotice]=useState<Notice|null>(null),[copied,setCopied]=useState(false),[busy,setBusy]=useState(false),input=useRef<HTMLInputElement>(null),timer=useRef<number|null>(null),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current!==null)window.clearTimeout(timer.current)}},[]);
  useEffect(()=>{if(notice?.manual){input.current?.focus();input.current?.select()}},[notice]);
  async function copy(instagram=false){
    if(timer.current!==null)window.clearTimeout(timer.current);
    try{
      await navigator.clipboard.writeText(data.url);if(!mounted.current)return;
      setCopied(true);setNotice({text:instagram?'Link copied. Paste it into an Instagram message or add it to a Story using the Link sticker.':'Article link copied. Paste it into any app you prefer.',manual:false,instagram});
      timer.current=window.setTimeout(()=>{if(mounted.current)setCopied(false)},2200);
    }catch{if(mounted.current){setCopied(false);setNotice({text:instagram?'Copy the link below, then paste it into an Instagram message or a Story Link sticker.':'Select and copy the article link below.',manual:true,instagram})}}
  }
  async function copyAction(instagram=false){if(busy)return;setBusy(true);try{await copy(instagram)}finally{if(mounted.current)setBusy(false)}}
  async function more(){
    if(busy)return;setBusy(true);setNotice(null);
    try{const payload={title:data.title,text:data.text,url:data.url};if(navigator.share&&(!navigator.canShare||navigator.canShare(payload))){await navigator.share(payload);return}await copy()}
    catch(error){if(!(error&&typeof error==='object'&&'name' in error&&error.name==='AbortError'))await copy()}
    finally{if(mounted.current)setBusy(false)}
  }
  const networks:{platform:SharePlatform;label:string;href:string}[]=[...data.links];networks.splice(2,0,{platform:'instagram',label:'Instagram',href:''});
  return <section className="article-share" aria-labelledby={heading}>
    <div className="article-share-heading"><h2 id={heading}>ఈ వార్తను షేర్ చేయండి</h2><span>Share this article</span></div>
    <div className="article-share-networks">{networks.map(link=>link.platform==='instagram'?<button key="instagram" className="article-share-option share-instagram" type="button" aria-label="Copy article link for Instagram" title="Copy link for Instagram" disabled={busy} onClick={()=>void copyAction(true)}><span className="article-share-icon"><ShareIcon name="instagram"/></span><span className="article-share-label">Instagram</span></button>:<a key={link.platform} className={'article-share-option share-'+link.platform} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={'Share on '+link.label} title={'Share on '+link.label}><span className="article-share-icon"><ShareIcon name={link.platform}/></span><span className="article-share-label">{link.label}</span></a>)}</div>
    <div className="article-share-utilities"><a href={data.email} className="article-share-utility" aria-label="Share article by email"><ShareIcon name="email"/><span>Email</span></a><button className="article-share-utility" type="button" onClick={()=>void copyAction()} disabled={busy} aria-label="Copy article link"><ShareIcon name={copied?'check':'link'}/><span>{copied?'Copied':'Copy link'}</span></button><button className="article-share-utility" type="button" onClick={()=>void more()} disabled={busy} aria-label="More sharing options"><ShareIcon name="more"/><span>More</span></button></div>
    <div className="article-share-feedback" role="status" aria-live="polite">{notice&&<><p>{notice.text}</p>{notice.manual&&<input ref={input} aria-label="Article link to copy" value={data.url} readOnly onFocus={event=>event.currentTarget.select()}/>} {notice.instagram&&<a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Open Instagram ↗</a>}</>}</div>
  </section>;
}
