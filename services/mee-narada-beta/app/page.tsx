import {db} from '../lib/db';
import {defaultHomeSettings} from '../lib/homepage';
import {emptyHomeContent,loadHomeContent,loadPinnedStories,loadPinnedReviews,loadPublishedHomepage} from '../lib/homepage-data';
import {HomePageView} from './components/HomePageView';
import {emptyAdInventory,loadAdInventory} from '../lib/advertising';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<{section?:string}>}){
  const [{section='latest'},settings,content,adInventory]=await Promise.all([searchParams,db?loadPublishedHomepage(db):defaultHomeSettings(),db?loadHomeContent(db):emptyHomeContent(),db?loadAdInventory(db).catch(()=>emptyAdInventory()):emptyAdInventory()]);
  if(db)try{[content.pinned,content.reviewPins]=await Promise.all([loadPinnedStories(db,settings,content.news),loadPinnedReviews(db,settings,content.reviews)])}catch(error){content.contentError=true;console.error('Homepage pinned stories query failed',error)}
  return <HomePageView settings={settings} content={content} section={section} adInventory={adInventory}/>;
}
