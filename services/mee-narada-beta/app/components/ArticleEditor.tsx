"use client";
import {useRef,useState} from "react";
import {ArticleContent} from "./ArticleContent";
export function ArticleEditor({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
 const ref=useRef<HTMLTextAreaElement>(null),[preview,setPreview]=useState(false);
 function insert(before:string,after="",placeholder="టెక్స్ట్"){
  const el=ref.current;const start=el?.selectionStart??value.length,end=el?.selectionEnd??start;
  const selected=value.slice(start,end)||placeholder;onChange(value.slice(0,start)+before+selected+after+value.slice(end));
  requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(start+before.length,start+before.length+selected.length)});
 }
 function video(){const url=window.prompt("Paste YouTube video URL (youtube.com or youtu.be)");if(!url)return;let id="";try{const u=new URL(url);if(["youtu.be","www.youtu.be"].includes(u.hostname))id=u.pathname.slice(1).split("/")[0];else if(["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname))id=u.searchParams.get("v")||u.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1]||""}catch{}if(!/^[\w-]{11}$/.test(id)){window.alert("Enter a valid YouTube URL.");return}onChange(value+(value?"\n\n":"")+"[youtube]https://www.youtube.com/watch?v="+id+"[/youtube]\n\n")}
 function link(){const url=window.prompt("Paste a link starting with https://");if(!url)return;try{const u=new URL(url);if(!["http:","https:"].includes(u.protocol))throw Error();insert("[","]("+u.href+")","లింక్ పేరు")}catch{window.alert("Enter a valid http or https link.")}}
 const tools=[["Paragraph",()=>insert("\n\n")],["H2",()=>insert("## ")],["H3",()=>insert("### ")],["Bold",()=>insert("**","**")],["Underline",()=>insert("__","__")],["• Bullets",()=>insert("- ")],["1. List",()=>insert("1. ")],["Link",link],["▶ YouTube",video]] as const;
 return <div className="article-editor"><div className="editor-heading"><strong>{label}</strong><button type="button" className="btn secondary" onClick={()=>setPreview(!preview)}>{preview?"Edit":"Preview"}</button></div>{preview?<div className="editor-preview"><ArticleContent value={value}/></div>:<><div className="editor-toolbar">{tools.map(([title,action])=><button type="button" key={title} onClick={action}>{title}</button>)}<select aria-label="Text color" defaultValue="" onChange={e=>{if(e.target.value)insert("[color:"+e.target.value+"]","[/color]");e.target.value=""}}><option value="">Text color</option>{["red","blue","green","orange","purple"].map(c=><option key={c} value={c}>{c}</option>)}</select></div><textarea ref={ref} className="editor-input" value={value} onChange={e=>onChange(e.target.value)} rows={12} placeholder="Write your article here. Select text and use the formatting toolbar."/></>}<p className="muted">Format using the toolbar, then Preview before publishing. Existing plain-text articles remain supported.</p></div>
}
