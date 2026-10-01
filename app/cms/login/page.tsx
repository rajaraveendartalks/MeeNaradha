import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import "../cms.css";

export default async function CmsLogin({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (data && ["editor","admin"].includes(data.role)) redirect("/cms");
  }
  const params = await searchParams;
  return <main className="cmsLoginPage"><section className="cmsLoginCard">
    <div className="cmsLoginBrand"><span>మీ నారద</span><b>MeeNaradha CMS</b></div>
    <p className="cmsLoginEyebrow">EDITORIAL WORKSPACE</p>
    <h1>Sign in</h1>
    <p className="cmsLoginIntro">Use your authorized editor or admin account to continue.</p>
    {params.error && <div className="cmsLoginError">{params.error}</div>}
    <form action="/cms/login/auth" method="post" className="cmsLoginForm">
      <label><span>Email address</span><input name="email" type="email" autoComplete="email" required /></label>
      <label><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
      <button type="submit">Sign in to CMS</button>
    </form>
    <p className="cmsLoginNote">Access is restricted to MeeNaradha editors and administrators.</p>
    <Link href="/" className="cmsLoginBack">← Return to MeeNaradha</Link>
  </section></main>;
}
