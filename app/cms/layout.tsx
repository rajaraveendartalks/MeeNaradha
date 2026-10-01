import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { cmsModules } from "../../lib/cms";
import "./cms.css";

export default async function CmsLayout({children}:{children:React.ReactNode}){
 const supabase=await createSupabaseServerClient();
 const {data:{user}}=await supabase.auth.getUser();

 // The login route is intentionally allowed to render without a session.
 // Protected CMS pages perform their own access check.
 if(!user) return <>{children}</>;

 const {data}=await supabase.from("user_roles").select("role").eq("user_id",user.id).single();

 // Allow the login page to render for signed-in users who do not have CMS access,
 // so it can display the appropriate access message instead of causing a loop.
 if(!data||!["editor","admin"].includes(data.role)) return <>{children}</>;

 return <div className="cmsShell"><aside className="cmsSide"><Link href="/cms" className="cmsBrand">MeeNaradha <b>CMS</b></Link><div className="cmsRole">{data.role.toUpperCase()}</div><nav>{cmsModules.map(m=><Link key={m.slug} href={"/cms/"+m.slug}>{m.title}<small>{m.titleTe}</small></Link>)}</nav><div className="cmsSideBottom"><Link className="cmsPublic" href="/">← Public site</Link><form action="/cms/logout" method="post"><button className="cmsLogout" type="submit">Sign out</button></form></div></aside><main className="cmsMain">{children}</main></div>
}