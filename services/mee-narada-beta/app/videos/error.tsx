"use client";
import Link from "next/link";
import {PublicHeader,PublicFooter} from "../components/PublicChrome";
export default function VideoError({reset}:{reset:()=>void}){
 return <><PublicHeader active="videos"/><main id="main-content" className="mn-container mn-library"><div className="mn-page-heading"><p className="mn-eyebrow">THE SCREEN ROOM</p><h1>Video temporarily unavailable</h1></div><div className="mn-empty"><p role="alert">We couldn’t load this video. Please try again shortly.</p><button type="button" className="mn-primary-button" onClick={reset}>Try again</button><Link href="/videos">← All videos</Link></div></main><PublicFooter/></>;
}
