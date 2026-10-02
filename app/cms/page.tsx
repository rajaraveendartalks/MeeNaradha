import Link from "next/link";
import { cmsModules } from "../../lib/cms";
import { requireCmsAccess } from "../../lib/cms-auth";

export default async function CmsHome(){
 await requireCmsAccess();
 return <><header className="cmsHead"><div><p>EDITORIAL WORKSPACE</p><h1>MeeNaradha V1 CMS</h1><span>English + తెలుగు · Draft → Review → Published</span></div></header><section className="cmsGrid">{cmsModules.map(m=><Link className="cmsCard" href={"/cms/"+m.slug} key={m.slug}><b>{m.title}</b><strong>{m.titleTe}</strong><span>Manage content →</span></Link>)}</section><section className="cmsInfo"><h2>V1 editorial foundation</h2><p>All writes use the signed-in Supabase session and remain subject to database RLS. Editors can create/update; protected deletion remains admin-only. Canonical entities and editorial workflow records are synchronized when supported by the V1 entity registry.</p></section></>;
}
