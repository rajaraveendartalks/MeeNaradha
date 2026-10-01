import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { cmsModules } from "../../lib/cms";
import "./cms.css";

export default async function CmsLayout({children}:{children:React.ReactNode}){
 const supabase=await createSupabaseServerClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/cms/access");
 const {data}=await supabase.from("user_roles").select("role").eq("user_id",user.id).single();
 if(!data || !["editor","admin"].includes(data.role)) redirect("/cms/access");
 return <div className="cmsShell"><aside className="cmsSide"><Link href="/cms" className="cmsBrand">MeeNaradha <b>CMS</b></Link><div className="cmsRole">{data.role.toUpperCase()}</div><nav>{cmsModules.map(m=><Link key={m.slug} href={"/cms/"+m.slug}>{m.title}<small>{m.titleTe}</small></Link>)}</nav><Link className="cmsPublic" href="/">← Public site</Link></aside><main className="cmsMain">{children}</main></div>
}
