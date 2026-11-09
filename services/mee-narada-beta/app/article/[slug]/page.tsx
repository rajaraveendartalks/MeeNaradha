import {PublicSiteHeader,PublicSiteFooter} from "../../components/PublicSiteNavigation";
import type {Metadata} from "next";
import ArticleShare from "../../components/ArticleShare";
import ArticleAnalytics from "../../components/ArticleAnalytics";
import {cache} from "react";
import {notFound} from "next/navigation";
import {ArticleContent} from "../../components/ArticleContent";
import {db,titleOf,type Article} from "../../../lib/db";
import {articleText,preferredArticleBody} from "../../../lib/rich-content";
import {loadArticleSidebar} from '../../../lib/article-layout';
import {emptyAdInventory,loadAdInventory} from '../../../lib/advertising';
import {categorySlug,findCategory,loadCategories} from '../../../lib/site-management';
import AdSlot from '../../components/AdSlot';
import ArticleSidebar from '../../components/ArticleSidebar';
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
  const [sections,inventory,categories]=await Promise.all([db?loadArticleSidebar(db,article.id).catch(()=>[]):[],db?loadAdInventory(db).catch(()=>emptyAdInventory()):emptyAdInventory(),db?loadCategories(db).catch(()=>[]):[]]);
  const category=findCategory(categories,article.category)?.slug||categorySlug(article.category||'');
  return <><PublicSiteHeader/><ArticleAnalytics articleId={article.id}/><main className="article-page"><AdSlot inventory={inventory} placement="article_header" articleId={article.id} category={category}/><div className="article-columns"><article className="detail"><span className="pill">{article.category||"NEWS"}</span><h1>{title}</h1><p className="muted">{article.published_at?new Date(article.published_at).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"}):""}</p>{article.hero_image_url&&<img className="hero" src={article.hero_image_url} alt={title}/>}<ArticleContent value={preferredArticleBody(article.body_te,article.body_en,article.dek_te)} inlineAd={<AdSlot inventory={inventory} placement="article_inline" articleId={article.id} category={category}/>}/><ArticleShare key={article.id} articleId={article.id} title={title} url={url} image={article.hero_image_url}/></article><aside className="article-sidebar"><AdSlot inventory={inventory} placement="article_sidebar" articleId={article.id} category={category}/><ArticleSidebar sections={sections}/></aside></div></main><PublicSiteFooter/></>;
}
