import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { cmsModules } from "../../lib/cms";
import "./cms.css";
export default async function CmsLayout({children}:{children:React.ReactNode}){
 const supabase=await createSupabaseServerClient();
 const {data:{user}}=await supabase.auth.getUser();
 const {data}=user?await supabase.from("user_roles").select("role").eq("user_id",user.id).single():{data:null};
 if(!user||!data||!["editor","admin"].includes(data.role)) return <main className="cmsAccess"><h1>MeeNaradha CMS</h1><p>This workspace requires a signed-in Supabase user with an <b>editor</b> or <b>admin</b> role.</p><p>No new authentication UI is introduced in this V1 CMS foundation.</p><Link href="/">← Return to MeeNaradha</Link></main>;
 return <div className="cmsShell"><aside className="cmsSide"><Link href="/cms" className="cmsBrand">MeeNaradha <b>CMS</b></Link><div className="cmsRole">{data.role.toUpperCase()}</div><nav>{cmsModules.map(m=><Link key={m.slug} href={"/cms/"+m.slug}>{m.title}<small>{m.titleTe}</small></Link>)}</nav><Link className="cmsPublic" href="/">← Public site</Link></aside><main className="cmsMain">{children}</main></div>
}