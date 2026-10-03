import { notFound } from "next/navigation";
import { getCmsModule } from "../../../../lib/cms";
import { requireCmsAccess } from "../../../../lib/cms-auth";
import { EditorForm } from "../editor-form";

export default async function NewPage({params}:{params:Promise<{module:string}>}){
 const {module:slug}=await params; const module=getCmsModule(slug); if(!module) notFound();
 await requireCmsAccess();
 let videos:any[]=[]; if(slug==="short-films"){const supabase=(await import("../../../../lib/supabase/server")).createSupabaseServerClient; const client=await supabase(); const q=await client.from("videos").select("id,title_en,title_te,platform,video_url,thumbnail_url").order("title_en"); videos=q.data||[];}
 return <EditorForm module={module} videos={videos}/>;
}
