import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getCmsModule } from "../../../lib/cms";
export default async function ModulePage({params}:{params:Promise<{module:string}>}){
 const {module:slug}=await params; const module=getCmsModule(slug); if(!module) notFound();
 const supabase=await createSupabaseServerClient();
 const {data,error}=await supabase.from(module.table).select("*").order("created_at",{ascending:false}).limit(100);
 return <><header className="cmsHead"><div><p>{module.titleTe}</p><h1>{module.title}</h1><span>{data?.length||0} records · V1</span></div><Link className="cmsButton" href={"/cms/"+slug+"/new"}>+ New</Link></header>
 {error?<div className="cmsError">{error.message}</div>:<div className="cmsTable"><div className="cmsRow cmsRowHead"><span>Content</span><span>Status</span><span>Updated / created</span><span></span></div>{(data||[]).map((row:any)=><div className="cmsRow" key={row.id}><span><b>{String(row[module.labelField]||row.slug||row.id)}</b><small>{row.title_te||row.name_te||row.headline_te||row.question_te||""}</small></span><span><em className={"status "+(row.status||"reference")}>{row.status||"reference"}</em></span><span>{new Date(row.updated_at||row.created_at).toLocaleString("en-IN")}</span><span><Link href={"/cms/"+slug+"/"+row.id}>Edit →</Link></span></div>)}</div>}
 </>;
}
