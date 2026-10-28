import Link from 'next/link';
import {type Article,titleOf} from '../../lib/db';
export type NewsLayout='lead-grid'|'split'|'compact';
const dateFormatter=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
function Story({article,lead=false,preview=false}:{article:Article;lead?:boolean;preview?:boolean}){
 const date=article.published_at||article.created_at,parsed=date?new Date(date):null;
 const content=<><div className="nc-image">{article.hero_image_url?<img src={article.hero_image_url} alt="" loading="lazy"/>:<span>Mee Narada</span>}{article.headline_en?.startsWith('[DEMO]')&&<span className="nc-demo">DEMO</span>}</div><div className="nc-copy"><h3>{titleOf(article)}</h3>{parsed&&!Number.isNaN(parsed.getTime())&&<time dateTime={parsed.toISOString()}>{dateFormatter.format(parsed)} IST</time>}</div></>;
 const className='nc-story'+(lead?' nc-lead':'');
 return preview?<div className={className}>{content}</div>:<Link href={'/article/'+encodeURIComponent(article.slug)} className={className}>{content}</Link>;
}
export function CategoryNews({id,title,articles,layout='lead-grid',viewAll,heading=true,preview=false}:{id:string;title:string;articles:Article[];layout?:NewsLayout;viewAll?:string;heading?:boolean;preview?:boolean}){
 const [lead,...remaining]=articles;
 return <section className={'nc-section nc-'+layout+(articles.length===1?' nc-single':'')} aria-labelledby={heading?id:undefined} aria-label={heading?undefined:title}>
  {heading&&<div className="nc-heading"><h2 id={id}>{title}</h2>{viewAll&&<Link href={viewAll}>అన్నీ చూడండి <span aria-hidden="true">→</span></Link>}</div>}
  {!lead?<p className="nc-empty">ఈ విభాగంలో ఇంకా ప్రచురించిన కథనాలు లేవు.</p>:layout==='split'?<div className="nc-body"><Story article={lead} lead preview={preview}/>{remaining.length>0&&<div className="nc-list">{remaining.map(article=><Story key={article.id} article={article} preview={preview}/>)}</div>}</div>:<div className="nc-body">{articles.map((article,index)=><Story key={article.id} article={article} lead={layout==='lead-grid'&&index===0} preview={preview}/>)}</div>}
 </section>;
}
