import { requireCmsAccess } from "../../../lib/cms-auth";
import { createClient } from "@supabase/supabase-js";
import { markTelegramDraftInReview, rejectTelegramDraft } from "./actions";

export const dynamic="force-dynamic";
type Intake={id:string;telegram_user_id:number;raw_text:string;source_urls:string[]|null;status:string;created_at:string;updated_at:string};
export default async function TelegramInbox({searchParams}:{searchParams:Promise<{status?:string}>}) {
 await requireCmsAccess();
 const {status="draft"}=await searchParams;
 const allowed=["draft","in_review","rejected","transferred"];
 const filter=allowed.includes(status)?status:"draft";
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) return <div className="cmsError">Telegram Inbox requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the Mee Narada CMS deployment. Do not expose the service role key to the browser.</div>;
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from("telegram_news_intake").select("id,telegram_user_id,raw_text,source_urls,status,created_at,updated_at").eq("status",filter).order("created_at",{ascending:false}).limit(100);
 const rows=(data||[]) as Intake[];
 return <><header className="cmsHead"><div><p>TELEGRAM · EDITORIAL</p><h1>Telegram News Inbox</h1><span>Private submissions · Review before CMS publishing</span></div></header>
 <nav style={{display:"flex",gap:12,flexWrap:"wrap",margin:"20px 0"}}>{allowed.map(s=><a key={s} href={"/cms/telegram-inbox?status="+s} className="cmsButton" style={{opacity:filter===s?1:0.65}}>{s.replace("_"," ")}</a>)}</nav>
 {error?<div className="cmsError">Unable to load inbox: {error.message}</div>:<p>{rows.length} submissions shown (latest 100)</p>}
 <div style={{display:"grid",gap:18}}>{rows.map(row=><article key={row.id} className="cmsCard" style={{display:"block",padding:22}}>
 <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>Telegram editor {row.telegram_user_id}</strong><span>{new Date(row.created_at).toLocaleString("en-IN")}</span></div>
 <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:"14px 0"}}>{row.raw_text}</p>
 <div><b>Sources:</b> {(row.source_urls||[]).length===0?"None provided":(row.source_urls||[]).map((source,i)=>{try{const parsed=new URL(source);if(!["https:","http:"].includes(parsed.protocol))return null;return <a key={i} href={parsed.href} target="_blank" rel="noopener noreferrer" style={{display:"block",overflowWrap:"anywhere"}}>{parsed.href}</a>}catch{return null}})}</div>
 <small>Draft ID: {row.id} · Status: {row.status}</small>
 {["draft","in_review"].includes(row.status)&&<form action={markTelegramDraftInReview} style={{display:"grid",gap:12,marginTop:16}}>
 <input type="hidden" name="id" value={row.id}/>
 <label htmlFor={"text-"+row.id}>Edit news text before review</label>
 <textarea id={"text-"+row.id} name="raw_text" defaultValue={row.raw_text} maxLength={10000} required rows={5} style={{width:"100%",padding:12,borderRadius:8}}/>
 <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button className="cmsButton" type="submit">Save & mark in review</button><button className="cmsButton" type="submit" formAction={rejectTelegramDraft}>Reject draft</button></div>
 </form>}
 </article>)}</div>
 {!error&&rows.length===0&&<p>No Telegram submissions in this status.</p>}
 <p style={{marginTop:24}}>Review actions do not publish news or create public articles. Only authorized CMS editors and admins can access this page.</p>
 </>;
}
