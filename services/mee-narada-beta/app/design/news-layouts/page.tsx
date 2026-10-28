import Link from 'next/link';
import {notFound} from 'next/navigation';
import {CategoryNews} from '../../components/CategoryNews';
import {type Article} from '../../../lib/db';
export const metadata={title:'Category News Layouts · Design Preview',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
const images=['dcVrYn74KjA','Eih78UP3dag','-RDS6kxTlAw','MDv5HHUNsbE','GNzqGLERZNg','qjp5KL_Zg4A','teyF15t-8lQ','46sQJ2L2WiM','n6V7ay-Knx0','MDkKfgkLESg','oFsErReRyuM','vNqIHJBKH3I'];
const titles=['కొత్త సినిమా విశేషాలు — ప్రధాన కథనం శీర్షిక ఇక్కడ కనిపిస్తుంది','ట్రైలర్ విశేషాలు, నటీనటుల పరిచయం — కథనం నమూనా','సినిమా ప్రపంచంలోని తాజా విశేషాలు — వార్తా శీర్షిక నమూనా','దర్శకుడి ఇంటర్వ్యూ ముఖ్యాంశాలు — లేఅవుట్ నమూనా','OTTలో కొత్త కథలు, ఆసక్తికరమైన పాత్రలు — కథనం నమూనా','సినిమా మేకింగ్ వెనుక సృజనాత్మక ప్రయాణం — శీర్షిక నమూనా'];
function samples(category:string):Article[]{return images.map((image,index)=>({id:category+'-'+index,slug:'preview-'+index,headline_en:'Sample headline '+(index+1),headline_te:titles[index%titles.length],hero_image_url:'https://i.ytimg.com/vi/'+image+'/hqdefault.jpg',category,status:'draft',published_at:null,created_at:'2026-10-28T06:00:00Z',dek_te:null,body_te:null,body_en:null}))}
export default function NewsLayouts(){
 if(process.env.VERCEL_ENV==='production')notFound();
 return <><header className="top"><div className="wrap topin"><Link href="/" className="logo">Mee <b>Narada</b></Link><Link href="/">← Homepage</Link></div></header><main className="wrap news-design-preview"><p className="eyebrow">DESIGN PREVIEW · SAMPLE CONTENT</p><h1>Category News Layouts</h1><p className="notice">లేఅవుట్ నమూనాలు మాత్రమే. ఇవి ప్రచురించిన వార్తలు కావు. Sample headlines and existing video thumbnails show the layout; story cards are disabled in this preview. The live sections use published news articles.</p><nav className="news-preview-tabs" aria-label="Layout examples"><a href="#example-grid">Lead + Cards</a><a href="#example-split">Lead + Headlines</a><a href="#example-compact">Compact Rows</a></nav><CategoryNews id="example-grid" title="సినిమా వార్తలు · Lead + Cards" articles={samples('movies').slice(0,10)} layout="lead-grid" preview/><CategoryNews id="example-split" title="OTT అప్‌డేట్స్ · Lead + Headlines" articles={samples('ott').slice(0,5)} layout="split" preview/><CategoryNews id="example-compact" title="బాక్సాఫీస్ · Compact Rows" articles={samples('box-office')} layout="compact" preview/></main></>;
}
