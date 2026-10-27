"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {db} from "../../../lib/db";
type Submission={id:string;title_en:string|null;title_te:string|null;content_type:string;production_company:string|null;description_en:string|null;video_url:string|null};
type Publication={id:string;slug:string;creator_submission_id:string;status:string};
const errorText=(e:unknown)=>typeof e==="object"&&e!==null&&"message" in e?String(e.message):"Unexpected error. Refresh the status before retrying.";
export default function VideoPublisher(){
 const [role,setRole]=useState("");
 const [account,setAccount]=useState("");
 const [items,setItems]=useState<Submission[]>([]);
 const [published,setPublished]=useState<Publication[]>([]);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const [loading,setLoading]=useState(true);
 async function load(){
  setLoading(true);setError("");setRole("");setItems([]);setPublished([]);setAccount("");
  try{
   if(!db)throw new Error("Video service is not configured.");
   const {data:{user},error:authError}=await db.auth.getUser();
   if(!user&&(!authError||authError.name==="AuthSessionMissingError"))throw new Error("Please sign in through the Administrator dashboard first.");
   if(authError)throw authError;
   if(!user)throw new Error("Please sign in through the Administrator dashboard first.");
   setAccount(user.email||"Signed-in user");
   const {data:access,error:roleError}=await db.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(roleError)throw roleError;
   setRole(access?.role||"No assigned role");
   if(access?.role!=="admin")throw new Error("Publishing requires an administrator account. Reviewer approval does not publish a video. Switch to your administrator account through the dashboard.");
   const [a,b]=await Promise.all([
    db.from("creator_submissions").select("id,title_en,title_te,content_type,production_company,description_en,video_url").eq("status","approved").in("content_type",["trailer","song","short_film","reel"]).order("created_at",{ascending:false}),
    db.from("videos").select("id,slug,creator_submission_id,status").not("creator_submission_id","is",null)
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   setItems(a.data||[]);setPublished(b.data||[]);
  }catch(e){setError(errorText(e))}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 async function publish(id:string){
  if(!db||busy||role!=="admin"||!window.confirm("Publish this approved creator video to the public Mee Narada website?"))return;
  setBusy(id);setMessage("");setError("");
  try{
   const {data,error}=await db.rpc("publish_creator_video",{p_submission_id:id});
   if(error)throw error;
   if(!data)throw new Error("No publication confirmation was returned. Refresh the status before retrying.");
   setMessage("Video published successfully.");
   const {data:video,error:refreshError}=await db.from("videos").select("id,slug,creator_submission_id,status").eq("id",data).single();
   if(refreshError){setError("The video was published, but its status could not be refreshed. Use Refresh status before retrying.");return}
   setPublished(previous=>[...previous.filter(item=>item.id!==video.id),video]);
  }catch(e){setError("Publishing failed: "+errorText(e))}finally{setBusy("")}
 }
 return <main style={{maxWidth:900,margin:"40px auto",padding:20,fontFamily:"Arial,sans-serif"}}>
  <Link href="/admin">← Administrator dashboard</Link><h1>Video Publishing Manager</h1>
  <p><strong>How publishing works:</strong> A reviewer approves the submission, then an administrator publishes its public video page.</p>
  {account&&<p>Signed in as <strong>{account}</strong> · Role: <strong>{role||"Checking…"}</strong></p>}
  {loading&&<p role="status">Loading publishing status…</p>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <button disabled={loading||busy!==""} onClick={()=>void load()}>Refresh status</button>
  {role==="admin"&&items.map(i=>{const existing=published.find(v=>v.creator_submission_id===i.id);return <article key={i.id} style={{padding:20,border:"1px solid #ddd",borderRadius:12,marginTop:16}}>
   <h2>{i.title_te||i.title_en}</h2><p>{i.content_type} · {i.production_company||"Independent creator"}</p><p>{i.description_en}</p>
   {i.video_url&&<p><a href={i.video_url} target="_blank" rel="noreferrer">Review source video</a></p>}
   {existing?(existing.status==="published"?<><p>Published</p><Link href={"/videos/"+encodeURIComponent(existing.slug)}>View published page →</Link></>:<p>Linked video status: {existing.status}. It is not public. An administrator must review the existing video.</p>):<><p>Approved · Not published</p><button disabled={busy!==""||!i.video_url} onClick={()=>void publish(i.id)} style={{background:"#d71939",color:"white",padding:"12px 18px",border:0,borderRadius:8,cursor:"pointer"}}>{busy===i.id?"Publishing…":"Publish video"}</button></>}
  </article>})}
  {role==="admin"&&!loading&&!error&&items.length===0&&<p>No approved creator videos available.</p>}
 </main>
}
