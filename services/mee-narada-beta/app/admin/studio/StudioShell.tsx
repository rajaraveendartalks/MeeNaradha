"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import {db} from "../../../lib/db";
import {errorMessage} from "../../../lib/studio-data";

type Access={client:SupabaseClient;userId:string;email:string;role:"admin"|"editor";setDirty:(dirty:boolean)=>void};
const StudioContext=createContext<Access|null>(null);
export function useStudio(){const context=useContext(StudioContext);if(!context)throw Error("Content Studio requires an authorized session.");return context}
export function useUnsavedChanges(dirty:boolean){
  const {setDirty}=useStudio();
  useEffect(()=>{setDirty(dirty);return()=>setDirty(false)},[dirty,setDirty]);
}
export default function StudioShell({children}:{children:ReactNode}){
  const pathname=usePathname(),[access,setAccess]=useState<Omit<Access,"client"|"setDirty">|null>(null),[auth,setAuth]=useState<"loading"|"signedOut"|"denied"|"ready">("loading");
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
  const sequence=useRef(0),mounted=useRef(true);
  const refresh=useCallback(async()=>{
    const current=++sequence.current;
    if(!db){setAuth("denied");setMessage("Content Studio is temporarily unavailable. Please contact your administrator.");return}
    try{
      const {data:{user},error}=await db.auth.getUser();
      if(!mounted.current||current!==sequence.current)return;
      if(error||!user){setAccess(null);setAuth("signedOut");return}
      const roles=await db.from("user_roles").select("role").eq("user_id",user.id).in("role",["admin","editor"]);
      if(!mounted.current||current!==sequence.current)return;
      if(roles.error)throw roles.error;
      const values=(roles.data||[]).map(row=>String(row.role)),role=values.includes("admin")?"admin":values.includes("editor")?"editor":null;
      if(!role){setAccess(null);setAuth("denied");setMessage("Your account does not have editor access. Contact your Mee Narada administrator.");return}
      setAccess({userId:user.id,email:user.email||"",role});setAuth("ready");
    }catch(error){if(mounted.current&&current===sequence.current){setAccess(null);setAuth("denied");setMessage(errorMessage(error))}}
  },[]);
  useEffect(()=>{
    mounted.current=true;void refresh();
    const subscription=db?.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"||!session){++sequence.current;setAccess(null);setAuth("signedOut");setDirty(false)}
      else window.setTimeout(()=>{if(mounted.current)void refresh()},0);
    }).data.subscription;
    return()=>{mounted.current=false;++sequence.current;subscription?.unsubscribe()};
  },[refresh]);
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=""};
    const navigate=(event:MouseEvent)=>{
      const link=event.target instanceof Element?event.target.closest("a"):null;
      if(!link||link.target==="_blank"||event.ctrlKey||event.metaKey||event.shiftKey)return;
      if(link.href!==window.location.href&&!window.confirm("You have unsaved changes. Leave this post?")){event.preventDefault();event.stopPropagation()}
    };
    window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);
    return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true)};
  },[dirty]);
  async function login(event:React.FormEvent){event.preventDefault();if(!db)return;setBusy(true);setMessage("");try{const {error}=await db.auth.signInWithPassword({email:email.trim(),password});setPassword("");if(error)throw error;await refresh()}catch(error){setMessage(errorMessage(error))}finally{setBusy(false)}}
  async function logout(){if(dirty&&!window.confirm("You have unsaved changes. Sign out anyway?"))return;setBusy(true);try{const result=await db?.auth.signOut();if(result?.error)throw result.error;setDirty(false);setAccess(null);setAuth("signedOut")}catch(error){setMessage(errorMessage(error))}finally{setBusy(false)}}
  const staging=process.env.NEXT_PUBLIC_STUDIO_STAGE==="test";
  if(auth!=="ready"||!access||!db)return <div className="studio-login-wrap"><div className="studio-login"><img src="/meenarada-logo.webp" alt="Mee Narada" width={210} height={70}/><h1>Content Studio</h1>{staging&&<p className="studio-stage">Test workspace</p>}{auth==="loading"?<p role="status">Checking your account…</p>:auth==="denied"?<><p className="studio-message" role="alert">{message}</p><button type="button" className="studio-button" onClick={()=>void logout()} disabled={busy}>Sign out / switch account</button><Link href="/">View website</Link></>:<form onSubmit={login}><p>Sign in with your Mee Narada editor account.</p>{message&&<p className="studio-message" role="alert">{message}</p>}<label className="studio-field"><span>Email address</span><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="studio-field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="studio-button studio-primary" disabled={busy||!db}>{busy?"Signing in…":"Sign in"}</button><Link href="/">← View website</Link></form>}</div></div>;
  return <StudioContext.Provider value={{...access,client:db,setDirty}}><div className="studio-shell">
    <header className="studio-topbar"><Link href="/admin">Mee Narada <span>Content Studio</span></Link><div>{staging&&<span className="studio-stage">Test workspace</span>}<span className="studio-account">{access.role==="admin"?"Administrator":"Editor"}</span><Link href="/" target="_blank" rel="noopener noreferrer">View website ↗</Link><button type="button" onClick={()=>void logout()} disabled={busy}>Sign out</button></div></header>
    <aside className="studio-sidebar"><Link href="/admin" aria-label="Mee Narada Content Studio"><img src="/meenarada-logo.webp" alt="Mee Narada" width={150} height={50}/></Link><span className="studio-nav-label">Publishing</span><nav aria-label="Content Studio"><Link href="/admin" aria-current={pathname==="/admin"||pathname.startsWith("/admin/posts")?"page":undefined}><span aria-hidden="true">▤</span> Posts</Link><Link href="/admin/homepage" aria-current={pathname.startsWith("/admin/homepage")?"page":undefined}><span aria-hidden="true">⌂</span> Homepage</Link><Link href="/admin/media" aria-current={pathname.startsWith("/admin/media")?"page":undefined}><span aria-hidden="true">▧</span> Media Library</Link><Link href="/admin/galleries" aria-current={pathname.startsWith("/admin/galleries")?"page":undefined}><span aria-hidden="true">▦</span> Galleries</Link></nav><div className="studio-sidebar-bottom"><span>{access.email}</span></div></aside>
    <main className="studio-main">{message&&<p className="studio-message" role="status">{message}</p>}{children}</main>
  </div></StudioContext.Provider>;
}
