import Link from "next/link";

const pathways = [
  ["Classes", "For youth, teens, and adults.", "/classes"],
  ["Summer Camp", "Creative weeks made for kids.", "/camp"],
  ["Events", "Performances, exhibits, and more.", "/events"],
  ["Shop", "Supplies and Allens Lane goods.", "/shop"],
] as const;

export default function Home() {
  return <div className="site-shell">
    <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">◌</span><span>ALLENS<br />LANE<br />ART CENTER</span></Link><nav><Link href="/classes">Classes</Link><Link href="/events">Events</Link><Link href="/shop">Shop</Link><Link href="/memberships">Membership</Link><Link href="/donate">Donate</Link></nav><Link className="account-link" href="/login">Sign in</Link></header>
    <main><section className="hero"><div className="hero-copy"><p className="eyebrow">Allens Lane Art Center</p><h1>Make room for creativity.</h1><p>Discover classes, summer camp, performances, and community arts experiences—all in one place.</p><div className="hero-actions"><Link className="button button-primary" href="/classes">Explore classes</Link><Link className="button button-secondary" href="/events">See events</Link></div></div><div className="hero-art" aria-hidden="true"><span>ART<br />LIVES<br />HERE</span></div></section><section className="pathways"><p className="eyebrow">Choose your experience</p><h2>Find your way into the arts.</h2><div className="pathway-grid">{pathways.map(([title, detail, href]) => <Link href={href} key={title}><strong>{title}</strong><span>{detail}</span></Link>)}</div></section></main>
    <footer className="site-footer"><p><strong>Allens Lane Art Center</strong><br />601 W Allens Lane · Philadelphia, PA 19119</p><div><Link href="/gift-certificates">Gift certificates</Link><Link href="/account">My account</Link><Link href="/contact">Contact</Link></div></footer>
  </div>;
}
