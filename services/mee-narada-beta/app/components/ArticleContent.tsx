import React from "react";
import {articleDocument,safeColor,safeHttpUrl,youtubeId,type RichNode} from "../../lib/rich-content";

/** Render allowlisted document nodes with React; author input is never HTML. */
function nodeContent(node:RichNode,key:React.Key):React.ReactNode{
  if(node.type==="text"){
    let content:React.ReactNode=node.text||"";
    for(const [index,mark] of (node.marks||[]).entries()){
      const mk=String(key)+"-"+index;
      if(mark.type==="bold")content=<strong key={mk}>{content}</strong>;
      else if(mark.type==="italic")content=<em key={mk}>{content}</em>;
      else if(mark.type==="underline")content=<u key={mk}>{content}</u>;
      else if(mark.type==="strike")content=<s key={mk}>{content}</s>;
      else if(mark.type==="code")content=<code key={mk}>{content}</code>;
      else if(mark.type==="textStyle"){const color=safeColor(mark.attrs?.color);if(color)content=<span style={{color}} key={mk}>{content}</span>}
      else if(mark.type==="link"){const href=safeHttpUrl(mark.attrs?.href);if(href)content=<a key={mk} href={href} target="_blank" rel="noopener noreferrer">{content}</a>}
    }
    return <React.Fragment key={key}>{content}</React.Fragment>;
  }
  const children=(node.content||[]).map((child,index)=>nodeContent(child,String(key)+"-"+index));
  switch(node.type){
    case "doc":return <React.Fragment key={key}>{children}</React.Fragment>;
    case "heading":return node.attrs?.level===3?<h3 key={key}>{children}</h3>:<h2 key={key}>{children}</h2>;
    case "paragraph":return <p key={key}>{children}</p>;
    case "blockquote":return <blockquote key={key}>{children}</blockquote>;
    case "bulletList":return <ul key={key}>{children}</ul>;
    case "orderedList":return <ol start={Number(node.attrs?.start)||1} key={key}>{children}</ol>;
    case "listItem":return <li key={key}>{children}</li>;
    case "codeBlock":return <pre key={key}><code>{children}</code></pre>;
    case "hardBreak":return <br key={key}/>;
    case "horizontalRule":return <hr key={key}/>;
    case "image":{const src=safeHttpUrl(node.attrs?.src);return src?<figure key={key} className="article-inline-image"><img src={src} alt={String(node.attrs?.alt||"")} loading="lazy"/></figure>:null}
    case "youtube":{const id=youtubeId(node.attrs?.src);return id?<div className="video-embed" key={key}><iframe src={"https://www.youtube-nocookie.com/embed/"+id} title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>:null}
    default:return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}
export function ArticleContent({value}:{value:string}){return <div className="rich-article">{nodeContent(articleDocument(value),"article")}</div>}
