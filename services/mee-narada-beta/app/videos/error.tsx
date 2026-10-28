'use client';
import Link from 'next/link';
export default function VideoError({reset}:{reset:()=>void}){return <main className="detail"><h1>Unable to load this video</h1><p>Please try again in a moment.</p><div className="actions"><button className="btn" onClick={reset}>Try again</button><Link className="btn secondary" href="/videos">Browse videos</Link></div></main>}
