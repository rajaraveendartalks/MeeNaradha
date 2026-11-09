import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {fetchNewsFeed} from '../../../../lib/news-feed';
import {newsTopics,type NewsScope,type NewsTopic} from '../../../../lib/news-desk';

export const dynamic='force-dynamic';
export async function GET(request:Request){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authorization=request.headers.get('authorization')||'';
  if(!url||!key)return NextResponse.json({error:'The news desk is unavailable.'},{status:503});
  if(!/^Bearer [\w.\-]+$/.test(authorization))return NextResponse.json({error:'Sign in to open the news desk.'},{status:401});
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
  const {data:{user},error}=await client.auth.getUser(authorization.slice(7));
  if(error||!user)return NextResponse.json({error:'Your session expired. Sign in again.'},{status:401});
  const access=await client.from('user_roles').select('role').eq('user_id',user.id).in('role',['admin','editor']);
  if(access.error||!access.data?.length)return NextResponse.json({error:'Editor access is required.'},{status:403});
  const params=new URL(request.url).searchParams,topic=params.get('topic')||'entertainment',scope=params.get('scope')||'telugu';
  if(!newsTopics.some(row=>row[0]===topic)||!['telugu','india'].includes(scope))return NextResponse.json({error:'Choose a news topic and region.'},{status:400});
  try{return NextResponse.json(await fetchNewsFeed(topic as NewsTopic,scope as NewsScope),{headers:{'Cache-Control':'private, no-store'}})}
  catch(error){console.error('News feed unavailable',error instanceof Error?error.message:'upstream error');return NextResponse.json({error:'The news provider is temporarily unavailable. Your saved drafts are safe. Try again or use Open news search.'},{status:502})}
}
