import Link from "next/link";

export function SiteLogo({ badge }: { badge?: string }) {
  return (
    <Link href="/" className="logo site-logo" aria-label="Mee Narada home">
      <img
        src="/meenarada-logo.webp"
        alt="మీ నారద · Mee Narada"
        width={210}
        height={70}
        fetchPriority="high"
        decoding="async"
      />
      {badge && <span className="logo-context">{badge}</span>}
    </Link>
  );
}
