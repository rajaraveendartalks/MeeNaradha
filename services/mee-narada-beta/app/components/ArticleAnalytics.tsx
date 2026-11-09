'use client';
import {useEffect} from 'react';
import {recordArticleEvent} from '../../lib/article-analytics';
export default function ArticleAnalytics({articleId}:{articleId:string}){
  useEffect(()=>{let sent=false;const record=()=>{if(!sent&&document.visibilityState==='visible'){sent=true;void recordArticleEvent(articleId,'view')}};const timer=window.setTimeout(record,1000);document.addEventListener('visibilitychange',record);return()=>{window.clearTimeout(timer);document.removeEventListener('visibilitychange',record)}},[articleId]);
  return null;
}
