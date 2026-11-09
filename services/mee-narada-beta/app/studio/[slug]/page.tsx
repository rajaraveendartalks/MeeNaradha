import {cache} from 'react';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {db} from '../../../lib/db';
import {articleSlugCandidates} from '../../../lib/article-routing';
import {PublicSiteHeader,PublicSiteFooter} from '../../components/PublicSiteNavigation';
import EntityArticles from '../../components/EntityArticles';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
const getStudio=cache(async(raw:string)=>{if(!db)throw Error('The studio service is unavailable.');const candidates=articleSlugCandidates(raw);if(!candidates.length)return null;const {data,error}=await db.from('companies').select('id,slug,name_en,name_te,description_en,description_te,company_type,logo_url,article_aliases,status').eq('status','published').in('slug',candidates);if(error)throw Error('This studio could not be loaded.');return candidates.map(slug=>(data||[]).find(row=>row.slug===slug)).find(Boolean)||null});
export async function generateMetadata({params}:Props):Promise<Metadata>{const studio=await getStudio((await params).slug);if(!studio)return {title:'Studio not found | Mee Narada',robots:{index:false}};const name=studio.name_te||studio.name_en,url='https://www.meenarada.com/studio/'+encodeURIComponent(studio.slug);return {title:name+' | Mee Narada',description:(studio.description_te||studio.description_en||name+' news and updates').slice(0,170),alternates:{canonical:url},openGraph:{title:name,url,...(studio.logo_url?{images:[studio.logo_url]}:{})}}}
export default async function Page({params}:Props){const studio=await getStudio((await params).slug);if(!studio)notFound();const name=studio.name_te||studio.name_en;return <><PublicSiteHeader/><main className="wrap profile-page"><div className="profile-hero">{studio.logo_url&&<img src={studio.logo_url} alt={name}/>}<div><span className="eyebrow">STUDIO / PRODUCTION HOUSE</span><h1>{name}</h1><p className="muted">{(studio.company_type||'studio').replace(/_/g,' ')}</p><p className="profile-description">{studio.description_te||studio.description_en||''}</p></div></div><EntityArticles entity={{kind:'company',id:studio.id,slug:studio.slug,name_en:studio.name_en,name_te:studio.name_te,article_aliases:studio.article_aliases||[]}}/></main><PublicSiteFooter/></>}
