"use client";

import { useState } from "react";

type Lang = "te" | "en" | "bi";

const copy = {
  te: {
    tagline: "తెలుగు వినోదం. మీ పల్స్.",
    search: "సినిమాలు, సెలబ్రిటీలు, వార్తలు వెతకండి...",
    latest: "తాజా వార్తలు",
    pulse: "Movie Pulse",
    pulseText: "సినిమా చూస్తూ మీ రియాక్షన్స్ నమోదు చేయండి. చివర్లో Audience Pulse తో పోల్చుకోండి.",
    start: "Pulse ప్రారంభించండి",
    releases: "త్వరలో విడుదల",
    ott: "OTT అప్‌డేట్స్",
    trending: "ఈ వారం Trending",
    poll: "ఈ వారం Poll",
    login: "Login",
    signup: "Sign Up"
  },
  en: {
    tagline: "Telugu entertainment. Your pulse.",
    search: "Search movies, celebrities, news...",
    latest: "Latest News",
    pulse: "Movie Pulse",
    pulseText: "React while you watch. Compare your movie journey with the audience after the show.",
    start: "Start Movie Pulse",
    releases: "Upcoming Releases",
    ott: "OTT Updates",
    trending: "Trending This Week",
    poll: "Poll of the Week",
    login: "Login",
    signup: "Sign Up"
  },
  bi: {
    tagline: "తెలుగు Entertainment. మీ Pulse.",
    search: "Movies, celebrities, వార్తలు వెతకండి...",
    latest: "తాజా వార్తలు · Latest News",
    pulse: "Movie Pulse · మీ స్పందన",
    pulseText: "సినిమా చూస్తూ react అవ్వండి. After the show, compare with the audience.",
    start: "Start Movie Pulse",
    releases: "త్వరలో · Upcoming Releases",
    ott: "OTT · అప్‌డేట్స్",
    trending: "Trending · ఈ వారం",
    poll: "Poll · ఈ వారం",
    login: "Login",
    signup: "Sign Up"
  }
};

const news = [
  ["BIG RELEASE", "ఈ వారం థియేటర్లలో సందడి చేయనున్న కొత్త సినిమాలు", "Movies"],
  ["OTT", "New Telugu releases arriving on streaming this weekend", "OTT"],
  ["INTERVIEW", "Director opens up about the story behind the year's most awaited film", "Celebrities"]
];

export default function Home() {
  const [lang, setLang] = useState<Lang>("bi");
  const t = copy[lang];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/"><span>మీ</span> నారద <small>MeeNaradha</small></a>
        <div className="search"><span>⌕</span><input aria-label="Search" placeholder={t.search}/></div>
        <div className="actions">
          <div className="lang" aria-label="Language selector">
            {(["te","en","bi"] as Lang[]).map(x => <button key={x} onClick={() => setLang(x)} className={lang===x?"active":""}>{x==="te"?"తెలుగు":x==="en"?"EN":"తె + EN"}</button>)}
          </div>
          <button className="ghost">{t.login}</button><button className="primary">{t.signup}</button>
        </div>
      </header>

      <nav className="nav">
        {["Home","Movies","Celebrities","News","OTT","Reviews","Box Office","Videos","Galleries","Short Films","Movie Pulse"].map(x => <a key={x} href="#">{x}</a>)}
      </nav>

      <section className="hero wrap">
        <div className="heroMain">
          <div className="eyebrow">MEENARADHA EXCLUSIVE</div>
          <h1>తెలుగు సినిమా ప్రపంచం<br/><span>ఒక్క చోట.</span></h1>
          <p>{t.tagline} News, movies, OTT, videos and audience reactions — built for Telugu movie lovers.</p>
          <div><button className="primary big">Explore Now</button><button className="glass big">▶ Watch Trailers</button></div>
        </div>
        <aside className="pulseCard">
          <div className="pulseIcon">🤩</div><div className="live">● LIVE EXPERIENCE</div>
          <h2>{t.pulse}</h2><p>{t.pulseText}</p>
          <div className="emoji">🤩 😂 🤯 😢 😬 😴</div>
          <button className="primary full">{t.start} →</button>
        </aside>
      </section>

      <section className="quick wrap">
        {[["🎬","Movies"],["⭐","Celebrities"],["📺","OTT"],["▶","Trailers"],["📸","Galleries"],["🎞","Short Films"],["🔥","Top 10"],["🗳","Polls"]].map(([i,x]) => <a href="#" className="quickItem" key={x}><b>{i}</b><span>{x}</span></a>)}
      </section>

      <section className="section wrap">
        <div className="sectionHead"><h2>{t.latest}</h2><a href="#">View all →</a></div>
        <div className="newsGrid">
          {news.map((n,i) => <article className={"newsCard n"+i} key={n[1]}>
            <div className="thumb"><span>{n[0]}</span><div className="cinema">{i===0?"🎥":i===1?"📺":"🎙️"}</div></div>
            <div className="newsBody"><small>{n[2]} · 2h ago</small><h3>{n[1]}</h3><p>తెలుగు సినిమా ప్రేక్షకుల కోసం ముఖ్యమైన వివరాలు, updates మరియు highlights.</p></div>
          </article>)}
        </div>
      </section>

      <section className="split wrap">
        <div className="panel"><div className="sectionHead"><h2>{t.releases}</h2><a href="#">Calendar →</a></div>
          {["Oct 09 · Thursday","Oct 16 · Thursday","Oct 23 · Thursday"].map((d,i)=><div className="release" key={d}><div className="poster">🎬</div><div><b>{["New Telugu Movie","Festival Release","Big Star Premiere"][i]}</b><small>{d} · Telugu</small></div><span>＋</span></div>)}
        </div>
        <div className="panel"><div className="sectionHead"><h2>{t.ott}</h2><a href="#">View all →</a></div>
          <div className="ottHero"><span>NEW ON OTT</span><h3>Weekend Watchlist</h3><p>తెలుగులో ఈ వారం చూడాల్సిన కొత్త సినిమాలు & shows.</p><button className="glass">Explore OTT →</button></div>
        </div>
      </section>

      <section className="darkBand"><div className="wrap">
        <div className="sectionHead light"><h2>🔥 {t.trending}</h2><a href="#">See Top 10 →</a></div>
        <div className="trendRow">{["#1 Movie"," #2 Star"," #3 Trailer"," #4 OTT"," #5 Interview"].map((x,i)=><div className="trend" key={x}><strong>{i+1}</strong><div><b>{x}</b><small>Trending now</small></div></div>)}</div>
      </div></section>

      <section className="poll wrap"><div><small>COMMUNITY</small><h2>{t.poll}</h2><h3>ఈ weekend మీరు ఏ సినిమా చూడాలని ప్లాన్ చేస్తున్నారు?</h3></div><div className="pollBtns"><button>Movie A</button><button>Movie B</button><button>Movie C</button></div></section>

      <footer><div className="wrap footer"><div className="brand inverse"><span>మీ</span> నారద <small>MeeNaradha</small></div><p>తెలుగు Entertainment · Movies · OTT · Movie Pulse</p><p>© 2026 MeeNaradha</p></div></footer>
    </main>
  );
}
