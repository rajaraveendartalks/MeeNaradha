"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {db} from "../../../lib/db";
export default function ResetPassword(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [ready,setReady]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[complete,setComplete]=useState(false);
 useEffect(()=>{
  if(!db){setMessage("Authentication is not configured.");return}
  const client=db;
  const hash=new URLSearchParams(window.location.hash.slice(1));
  if(hash.get("error"))setMessage(hash.get("error_description")||"This recovery link has expired.");
  client.auth.getSession().then(({data})=>{if(data.session)setReady(true)});
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   if(event==="PASSWORD_RECOVERY"||(event==="SIGNED_IN"&&session))setReady(true);
   if(event==="SIGNED_OUT")setReady(false);
  });
  return()=>subscription.unsubscribe();
 },[]);
 async function request(e:React.FormEvent){
  e.preventDefault();if(!db)return;setSaving(true);setMessage("");
  const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+"/admin/reset-password"});
  setSaving(false);setMessage(error?error.message:"If this address is registered, a recovery email will arrive shortly. Open its link in the same browser.");
 }
 async function update(e:React.FormEvent){
  e.preventDefault();if(!db)return;
  if(password.length<12){setMessage("Use at least 12 characters.");return}
  if(password!==confirm){setMessage("Passwords do not match.");return}
  setSaving(true);const {error}=await db.auth.updateUser({password});setSaving(false);
  if(error){setMessage(error.message);return}
  setPassword("");setConfirm("");setComplete(true);setMessage("Password updated successfully. You can now sign in with your new password.");
  await db.auth.signOut();
 }
 return <><header className="top"><div className="wrap topin"><Link href="/" className="logo">Mee <b>Narada</b></Link></div></header>
 <main className="admin"><h1>Reset CMS password</h1><section className="panel">
 {message&&<p className="notice" role="status">{message}</p>}
 {complete?<p><Link className="btn" href="/admin">Return to CMS login →</Link></p>:ready?
 <form onSubmit={update}><p>Choose a new password for your Mee Narada account.</p>
 <label className="field"><strong>New password</strong><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <label className="field"><strong>Confirm password</strong><input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
 <button className="btn" disabled={saving}>{saving?"Updating…":"Update password"}</button></form>:
 <form onSubmit={request}><p>Enter your CMS email to receive a secure password recovery link.</p>
 <label className="field"><strong>Email</strong><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <button className="btn" disabled={saving}>{saving?"Sending…":"Send reset email"}</button></form>}
 <p><Link href="/admin">Back to CMS login →</Link></p></section></main></>;
}
