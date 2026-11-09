'use client';
import Link from 'next/link';
export default function ArticleError({reset}:{reset:()=>void}){return <main className="detail"><h1>Unable to load this article</h1><p>The article service is temporarily unavailable. Please try again.</p><div className="actions"><button type="button" className="btn" onClick={reset}>Try again</button><Link className="btn secondary" href="/">Go to homepage</Link></div></main>}
