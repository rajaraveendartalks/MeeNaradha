import PostEditor from "../../studio/PostEditor";
import {statusNames,type PostStatus} from "../../../../lib/studio-data";
export default async function PostPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){
  const [{id},{saved}]=await Promise.all([params,searchParams]);
  const notice=saved&&saved in statusNames?statusNames[saved as PostStatus]+" saved.":"";
  return <PostEditor key={id} id={id} initialNotice={notice}/>;
}
