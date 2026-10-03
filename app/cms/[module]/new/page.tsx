import { notFound } from "next/navigation";
import { getCmsModule } from "../../../../lib/cms";
import { requireCmsAccess } from "../../../../lib/cms-auth";
import { EditorForm } from "../editor-form";

export default async function NewPage({params}:{params:Promise<{module:string}>}){
 const {module:slug}=await params; const module=getCmsModule(slug); if(!module) notFound();
 const {supabase}=await requireCmsAccess();
 let reviewMovies:any[]=[]; let reviewOttTitles:any[]=[];
 if(slug==="reviews"){const [m,o]=await Promise.all([supabase.from("movies").select("id,title_en,title_te").order("title_en").limit(1000),supabase.from("ott_titles").select("id,title_en,title_te").order("title_en").limit(1000)]);reviewMovies=(m.data||[]).map((x:any)=>({id:x.id,name_en:x.title_en,name_te:x.title_te}));reviewOttTitles=(o.data||[]).map((x:any)=>({id:x.id,name_en:x.title_en,name_te:x.title_te}));}
 return <EditorForm module={module} reviewMovies={reviewMovies} reviewOttTitles={reviewOttTitles}/>;
}
