import {PublicSiteHeader,PublicSiteFooter} from "../../components/PublicSiteNavigation";
import type {Metadata} from "next";
import Link from "next/link";
import {cache} from "react";
import {notFound} from "next/navigation";
import {ArticleContent} from "../../components/ArticleContent";
import {db,titleOf,type Article} from "../../../lib/db";
import {articleText,preferredArticleBody} from "../../../lib/rich-content";
export const dynamic="force-dynamic";
type ArticleRecord=Article&{dek_en:string|null};
const getArticle=cache(async(slug:string):Promise<ArticleRecord|null>=>{
  if(!db)return null;
  const {data}=await db.from("news_articles").select("id,slug,headline_te,headline_en,dek_te,dek_en,body_te,body_en,hero_image_url,category,status,published_at,created_at").eq("slug",slug).eq("status","published").maybeSingle();
  return data as ArticleRecord|null;
});
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||"https://www.meenarada.com").replace(/\/$/,"");
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const article=await getArticle((await params).slug);
  if(!article)return {title:"Article not found | Mee Narada",robots:{index:false,follow:false}};
  const title=titleOf(article),description=(article.dek_te||article.dek_en||articleText(preferredArticleBody(article.body_te,article.body_en))).replace(/\s+/g," ").slice(0,160),url=siteUrl+"/article/"+encodeURIComponent(article.slug);
  return {title:title+" | Mee Narada",description,alternates:{canonical:url},openGraph:{type:"article",title,description,url,siteName:"Mee Narada",...(article.hero_image_url?{images:[article.hero_image_url]}:{})},twitter:{card:article.hero_image_url?"summary_large_image":"summary",title,description}};
}
export default async function Page({params}:{params:Promise<{slug:string}>}){
  const article=await getArticle((await params).slug);if(!article)notFound();
  const title=titleOf(article),url=siteUrl+"/article/"+encodeURIComponent(article.slug);
  return <><PublicSiteHeader/><article className="detail"><span className="pill">{article.category||"NEWS"}</span><h1>{title}</h1><p className="muted">{article.published_at?new Date(article.published_at).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"}):""}</p>{article.hero_image_url&&<img className="hero" src={article.hero_image_url} alt={title}/>}<ArticleContent value={preferredArticleBody(article.body_te,article.body_en,article.dek_te)}/><p><a href={"https://wa.me/?text="+encodeURIComponent(title+" "+url)} target="_blank" rel="noopener noreferrer">WhatsAppలో షేర్ చేయండి ↗</a></p></article><PublicSiteFooter/></>;
}
