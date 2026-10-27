"use client";
import Link from "next/link";
export default function VideoError({reset}:{reset:()=>void}){
 return <main style={{maxWidth:900,margin:"40px auto",padding:20,fontFamily:"Arial,sans-serif"}}>
  <h1>Video temporarily unavailable</h1>
  <p role="alert">We couldn’t load this video. Please try again shortly.</p>
  <button type="button" onClick={reset}>Try again</button>
  <p><Link href="/videos">← All videos</Link></p>
 </main>;
}
