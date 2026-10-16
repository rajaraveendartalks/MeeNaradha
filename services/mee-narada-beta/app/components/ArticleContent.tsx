import React from "react";

/** Restricted editorial markup: never interpret author input as HTML. */
function inline(text:string):React.ReactNode[]{
 const pattern=/(\*\*[^*\n]+\*\*|__[^_\n]+__|\[color:(red|blue|green|orange|purple)\][\s\S]*?\[\/color\]|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
 return text.split(pattern).filter(Boolean).map((part,i)=>{
  if(part.startsWith("**")&&part.endsWith("**"))return <strong key={i}>{part.slice(2,-2)}</strong>;
  if(part.startsWith("__")&&part.endsWith("__"))return <u key={i}>{part.slice(2,-2)}</u>;
  const color=part.match(/^\[color:(red|blue|green|orange|purple)\]([\s\S]*)\[\/color\]$/);
  if(color)return <span key={i} style={{color:({red:"#cf233d",blue:"#2164c4",green:"#18794e",orange:"#ba6100",purple:"#793cb5"} as Record<string,string>)[color[1]]}}>{color[2]}</span>;
  const link=part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if(link){try{const url=new URL(link[2]);if(["http:","https:"].includes(url.protocol))return <a key={i} href={url.href} target="_blank" rel="noopener noreferrer">{link[1]}</a>}catch{}}
  return part;
 });
}
function youtubeId(url:string){try{const u=new URL(url);const h=u.hostname.toLowerCase();let id="";if(h==="youtu.be"||h==="www.youtu.be")id=u.pathname.slice(1).split("/")[0];else if(["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(h)){id=u.searchParams.get("v")||u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]||""}return /^[\w-]{11}$/.test(id)?id:null}catch{return null}}
export function ArticleContent({value}:{value:string}){
 const blocks=value.replace(/\r\n/g,"\n").split(/\n\s*\n/);
 return <div className="rich-article">{blocks.map((block,i)=>{
  const t=block.trim();if(!t)return null;
  const video=t.match(/^\[youtube\]\s*(https?:\/\/\S+)\s*\[\/youtube\]$/i);
  if(video){const id=youtubeId(video[1]);return id?<div className="video-embed" key={i}><iframe src={"https://www.youtube-nocookie.com/embed/"+id} title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>:<p key={i}>Invalid YouTube URL</p>}
  if(t.startsWith("### "))return <h3 key={i}>{inline(t.slice(4))}</h3>;
  if(t.startsWith("## "))return <h2 key={i}>{inline(t.slice(3))}</h2>;
  const lines=t.split("\n");
  if(lines.every(l=>/^[-*] /.test(l)))return <ul key={i}>{lines.map((l,j)=><li key={j}>{inline(l.slice(2))}</li>)}</ul>;
  if(lines.every(l=>/^\d+\. /.test(l)))return <ol key={i}>{lines.map((l,j)=><li key={j}>{inline(l.replace(/^\d+\. /,""))}</li>)}</ol>;
  return <p key={i}>{lines.map((l,j)=><React.Fragment key={j}>{j>0&&<br/>}{inline(l)}</React.Fragment>)}</p>;
 })}</div>;
}
