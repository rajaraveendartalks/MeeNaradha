import Link from 'next/link';
import {db} from '../../lib/db';
import {loadHomeReviews} from '../../lib/home-reviews';
import {PublicSiteHeader,PublicSiteFooter} from '../components/PublicSiteNavigation';
import {ReviewShowcase} from '../components/HomeNewsPresets';
export const dynamic='force-dynamic';
export const metadata={title:'సినిమా రివ్యూలు | Mee Narada',description:'Mee Narada movie and OTT reviews.',alternates:{canonical:'https://www.meenarada.com/reviews'}};
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){const value=(await searchParams).page||'1',page=/^[1-9][0-9]{0,2}$/.test(value)?Math.min(Number(value),500):1;if(!db)throw Error('Reviews are temporarily unavailable.');const {stories,count}=await loadHomeReviews(db,{page});return <><PublicSiteHeader/><main className="wrap review-library"><h1>సినిమా రివ్యూలు</h1><p className="muted">Movie &amp; OTT reviews · Mee Narada editorial ratings</p><ReviewShowcase id="published-reviews" title="తాజా రివ్యూలు" stories={stories} viewAll=""/><nav className="review-pagination" aria-label="Review pages">{page>1?<Link href={'/reviews?page='+(page-1)}>← మునుపటి</Link>:<span/>}<span>Page {page} · {count} reviews</span>{page*20<count?<Link href={'/reviews?page='+(page+1)}>తదుపరి →</Link>:<span/>}</nav></main><PublicSiteFooter/></>}
