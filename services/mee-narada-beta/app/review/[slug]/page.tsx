import {cache} from 'react';
import Link from 'next/link';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {db,titleOf} from '../../../lib/db';
import {loadPublishedReview} from '../../../lib/home-reviews';
import {preferredArticleBody,articleText} from '../../../lib/rich-content';
import {ArticleContent} from '../../components/ArticleContent';
import {PublicSiteHeader,PublicSiteFooter} from '../../components/PublicSiteNavigation';
import {ReviewRating,StoryDate} from '../../components/HomeNewsPresets';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
const getReview=cache(async(slug:string)=>{if(!db)throw Error('Reviews are temporarily unavailable.');return loadPublishedReview(db,slug)});
export async function generateMetadata({params}:Props):Promise<Metadata>{const story=await getReview((await params).slug);if(!story)return {title:'Review not found | Mee Narada',robots:{index:false,follow:false}};const title=titleOf(story),url='https://www.meenarada.com/review/'+encodeURIComponent(story.slug),description=articleText(story.dek_te||preferredArticleBody(story.body_te,story.body_en)).slice(0,170);return {title:title+' · Review | Mee Narada',description,alternates:{canonical:url},openGraph:{type:'article',title,description,url,...(story.hero_image_url?{images:[story.hero_image_url]}:{})}}}
export default async function Page({params}:Props){const story=await getReview((await params).slug);if(!story)notFound();return <><PublicSiteHeader/><main className="wrap review-public-page"><article className="detail"><Link href="/reviews" className="eyebrow">← సినిమా రివ్యూలు</Link><h1>{titleOf(story)}</h1><StoryDate story={story}/><ReviewRating rating={story.rating}/>{story.hero_image_url&&<img className="hero" src={story.hero_image_url} alt={titleOf(story)}/>}<ArticleContent value={preferredArticleBody(story.body_te,story.body_en)}/>{story.dek_te&&<div className="review-verdict"><strong>తీర్పు</strong><p>{story.dek_te}</p></div>}<p className="muted">The five-star display is equivalent to the saved editorial score out of 10. This rating is separate from audience reactions.</p><p><Link href="/reviews">మరిన్ని రివ్యూలు చదవండి →</Link></p></article></main><PublicSiteFooter/></>}
