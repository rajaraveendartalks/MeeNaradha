import {db} from '../lib/db';
import {defaultHomeSettings} from '../lib/homepage';
import {emptyHomeContent,loadHomeContent,loadPinnedStories,loadPublishedHomepage} from '../lib/homepage-data';
import {HomePageView} from './components/HomePageView';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<{section?:string}>}){
  const [{section='latest'},settings,content]=await Promise.all([searchParams,db?loadPublishedHomepage(db):defaultHomeSettings(),db?loadHomeContent(db):emptyHomeContent()]);
  if(db&&section==='latest')try{content.pinned=await loadPinnedStories(db,settings,content.news)}catch(error){console.error('Homepage featured stories query failed',error)}
  return <HomePageView settings={settings} content={content} section={section}/>;
}
