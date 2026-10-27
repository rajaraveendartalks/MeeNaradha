import Link from "next/link";
import {PublicHeader,PublicFooter} from "../components/PublicChrome";
export default function VideoNotFound(){return <><PublicHeader active="videos"/><main id="main-content" className="mn-container mn-library"><div className="mn-page-heading"><p className="mn-eyebrow">THE SCREEN ROOM</p><h1>Video not found</h1><p>ఈ వీడియో అందుబాటులో లేదు. మరిన్ని వీడియోలను చూడండి.</p></div><Link className="mn-primary-button" href="/videos">Browse videos ↗</Link></main><PublicFooter/></>}
