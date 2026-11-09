'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {chooseAd,type AdCampaign,type AdInventory,type AdPlacementId} from '../../lib/advertising';
import {googleConsentAllowed,type ConsentData} from '../../lib/ad-consent';
import {analyticsAllowed} from '../../lib/article-analytics';
import type {AdEvent} from '../../../../supabase/functions/advertising/validation';
type TcfApi=(command:string,version:number,callback:(data:ConsentData,success:boolean)=>void,parameter?:number)=>void;
type AdWindow=Window&{__tcfapi?:TcfApi;adsbygoogle?:unknown[]};
function advertisingAllowed(){if(!analyticsAllowed())return false;try{if(localStorage.getItem('sb-'+new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'').hostname.split('.')[0]+'-auth-token'))return false}catch{}return true}
async function recordAd(event:AdEvent){
 if(!advertisingAllowed())return;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return;
 try{await fetch(url+'/functions/v1/advertising',{method:'POST',headers:{apikey:key,'content-type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,body:JSON.stringify({action:'event',event})})}catch{/* Ads and links work even when measurement is blocked. */}
}
function DirectBanner({campaign,placement,device,articleId,category}:{campaign:AdCampaign;placement:AdPlacementId;device:'desktop'|'mobile';articleId:string|null;category:string}){
 const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),element=useRef<HTMLAnchorElement>(null),identity=useRef(''),sent=useRef(new Set<string>());
 function event(kind:AdEvent['kind']){if(!identity.current)identity.current=crypto.randomUUID();if(sent.current.has(kind))return;sent.current.add(kind);void recordAd({campaign_id:campaign.id,placement,kind,display_id:identity.current,article_id:articleId,category,device})}
 const eventRef=useRef(event);eventRef.current=event;
 useEffect(()=>{if(!loaded||failed||!element.current||typeof IntersectionObserver==='undefined')return;let timer:ReturnType<typeof setTimeout>|undefined,visible=false;
  const clear=()=>{if(timer)clearTimeout(timer);timer=undefined},start=()=>{clear();if(visible&&document.visibilityState!=='hidden')timer=setTimeout(()=>eventRef.current('viewable'),1000)};
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting&&entries[0].intersectionRatio>=0.5;start()},{threshold:[0,0.5]});observer.observe(element.current);const visibility=()=>start();document.addEventListener('visibilitychange',visibility);return()=>{clear();observer.disconnect();document.removeEventListener('visibilitychange',visibility)};
 },[loaded,failed]);
 if(failed)return <Link className="ad-house" href="/advertise">Advertise on Mee Narada <span>Explore campaign placements →</span></Link>;
 return <a ref={element} href={campaign.destination_url} target="_blank" rel="sponsored noopener noreferrer" onClick={()=>event('click')} aria-label={campaign.alt_text}><img src={device==='mobile'&&campaign.mobile_image_url?campaign.mobile_image_url:campaign.image_url} alt={campaign.alt_text} loading={placement.endsWith('header')?'eager':'lazy'} onLoad={()=>{setLoaded(true);event('impression')}} onError={()=>setFailed(true)}/></a>;
}
function GoogleBanner({publisher,slot,horizontal}:{publisher:string;slot:string;horizontal:boolean}){
 const [consent,setConsent]=useState(false),container=useRef<HTMLDivElement>(null),ins=useRef<HTMLModElement>(null),[size,setSize]=useState<{width:number;height:number}|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{if(!advertisingAllowed())return;let active=true,listener:number|undefined,api:TcfApi|undefined;
  const attach=()=>{const found=(window as AdWindow).__tcfapi;if(!found||api)return;api=found;api('addEventListener',2,(data,success)=>{if(!active)return;listener=data.listenerId;setConsent(googleConsentAllowed(data,success))})};
  attach();const timer=setInterval(attach,1000);return()=>{active=false;clearInterval(timer);if(api&&listener!==undefined)api('removeEventListener',2,()=>{},listener)};
 },[]);
 useEffect(()=>{if(!container.current)return;const measure=()=>{const width=container.current!.clientWidth;if(width<300){setSize(null);return}setSize(horizontal?width>=970?{width:970,height:90}:width>=728?{width:728,height:90}:width>=468?{width:468,height:60}:width>=320?{width:320,height:100}:{width:300,height:100}:{width:300,height:250})};measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;observer?.observe(container.current);return()=>observer?.disconnect()},[horizontal]);
 useEffect(()=>{if(!consent||!size||!ins.current||failed)return;let active=true;const node=ins.current;if(node.dataset.adsbygoogleStatus||node.dataset.mnrRequested)return;
  const push=()=>{if(!active||node.dataset.adsbygoogleStatus||node.dataset.mnrRequested)return;node.dataset.mnrRequested='true';try{((window as AdWindow).adsbygoogle||=[]).push({})}catch{if(active)setFailed(true)}};
  let script=document.querySelector<HTMLScriptElement>('script[data-meenarada-adsense]');if(!script){script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';script.dataset.meenaradaAdsense='true';script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(publisher);document.head.appendChild(script)}
  const onError=()=>{if(active)setFailed(true)};script.addEventListener('load',push);script.addEventListener('error',onError);if((window as AdWindow).adsbygoogle&&script.dataset.loaded==='true')push();const mark=()=>{script!.dataset.loaded='true'};script.addEventListener('load',mark);
  return()=>{active=false;script?.removeEventListener('load',push);script?.removeEventListener('error',onError);script?.removeEventListener('load',mark)};
 },[consent,size?.width,size?.height,publisher,slot,failed]);
 return <div className="ad-google-box" ref={container}>{consent&&size&&!failed?<ins ref={ins} className="adsbygoogle" style={{display:'inline-block',width:size.width,height:size.height}} data-ad-client={publisher} data-ad-slot={slot}/>:<Link href="/advertise" className="ad-house">Advertise on Mee Narada <span>Explore campaign placements →</span></Link>}</div>;
}
export default function AdSlot({inventory,placement,category='',articleId=null}:{inventory:AdInventory;placement:AdPlacementId;category?:string;articleId?:string|null}){
 const [device,setDevice]=useState<'desktop'|'mobile'|null>(null),[elapsed,setElapsed]=useState(0),clock=useRef<number|null>(null),[seed,setSeed]=useState('');
 useEffect(()=>{const media=window.matchMedia('(min-width: 901px)'),update=()=>setDevice(media.matches?'desktop':'mobile');update();media.addEventListener('change',update);setSeed(crypto.randomUUID());clock.current=performance.now();const timer=setInterval(()=>setElapsed(performance.now()-(clock.current||0)),30000);return()=>{media.removeEventListener('change',update);clearInterval(timer)}},[]);
 const slot=inventory.config.placements.find(row=>row.id===placement),now=Date.parse(inventory.generated_at)+elapsed;
 if(!slot?.enabled)return null;const google=inventory.config.google_enabled&&inventory.config.consent_ready&&Boolean(inventory.config.publisher_id&&slot.google_slot);
 const desktop=chooseAd(inventory,placement,category,'desktop',now,seed),mobile=chooseAd(inventory,placement,category,'mobile',now,seed),desktopPotential=slot.desktop&&(Boolean(desktop)||google),mobilePotential=placement!=='article_sidebar'&&slot.mobile&&(Boolean(mobile)||google);
 if(!desktopPotential&&!mobilePotential||device==='desktop'&&!desktopPotential||device==='mobile'&&!mobilePotential)return null;
 const campaign=device==='desktop'?desktop:mobile,horizontal=placement.endsWith('header')||placement==='home_feed';
 return <div className={'site-ad-slot site-ad-'+placement+(!mobilePotential?' ad-desktop-only':'')+(!desktopPotential?' ad-mobile-only':'')} aria-label="Advertisements"><span className="site-ad-label">Advertisements</span><div className="site-ad-creative">{!device?<span aria-hidden="true"/>:campaign?<DirectBanner key={campaign.id+'-'+(articleId||category)+'-'+device} campaign={campaign} placement={placement} device={device} articleId={articleId} category={category}/>:google?<GoogleBanner publisher={inventory.config.publisher_id} slot={slot.google_slot} horizontal={horizontal}/>:null}</div></div>;
}
