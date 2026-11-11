'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {HomePageView} from '../../components/HomePageView';
import type {HomeSettings} from '../../../lib/homepage';
import type {HomeContent} from '../../../lib/homepage-data';
const documentSource='<!doctype html><html lang="te"><head><title>Homepage preview</title></head><body style="margin:0"><div id="homepage-preview-root"></div></body></html>';
export default function HomepagePreview({settings,content}:{settings:HomeSettings;content:HomeContent}){
 const frame=useRef<HTMLIFrameElement>(null),[mode,setMode]=useState<'desktop'|'mobile'>('desktop'),[target,setTarget]=useState<HTMLElement|null>(null);
 const loaded=useCallback(()=>{const doc=frame.current?.contentDocument;if(!doc?.body)return;if(!doc.head.querySelector('[data-preview-styles]')){const base=doc.createElement('base');base.href=window.location.origin+'/';base.dataset.previewStyles='true';doc.head.appendChild(base);for(const node of document.querySelectorAll('link[rel="stylesheet"],style'))doc.head.appendChild(node.cloneNode(true))}doc.body.style.cssText=document.body.style.cssText;doc.body.style.margin='0';let root=doc.getElementById('homepage-preview-root');if(!root){root=doc.createElement('div');root.id='homepage-preview-root';doc.body.appendChild(root)}setTarget(root)},[]);
 // An SSR iframe can finish loading before React attaches its load listener.
 useEffect(()=>{if(frame.current?.contentDocument?.readyState==='complete')loaded()},[loaded]);
 return <div className="studio-home-preview-shell"><div className="studio-home-preview-toolbar" role="group" aria-label="Preview screen size"><button type="button" className="studio-button" aria-pressed={mode==='desktop'} onClick={()=>setMode('desktop')}>Desktop · 1180 px</button><button type="button" className="studio-button" aria-pressed={mode==='mobile'} onClick={()=>setMode('mobile')}>Mobile · 390 px</button><span>Unsaved layout · published content only · links disabled</span></div><div className="studio-home-preview-viewport"><iframe ref={frame} title={mode==='desktop'?'Desktop homepage preview':'Mobile homepage preview'} sandbox="allow-same-origin" srcDoc={documentSource} width={mode==='desktop'?1180:390} height={760} onLoad={loaded}/></div>{target&&createPortal(<div className="studio-home-preview" onClickCapture={event=>{const element=event.target as Element;if(typeof element.closest==='function'&&element.closest('a'))event.preventDefault()}}><HomePageView settings={settings} content={content} preview/></div>,target)}</div>;
}
