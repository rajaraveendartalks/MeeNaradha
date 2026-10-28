import Link from 'next/link';
export default function MissingVideo(){return <main className="detail"><h1>Video not found</h1><p>This video is unavailable or has not been published.</p><Link className="btn" href="/videos">Browse videos →</Link></main>}
