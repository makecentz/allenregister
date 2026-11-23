import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

const pathways = [
  ["Classes", "For youth, teens, and adults.", "/classes"],
  ["Summer Camp", "Creative weeks made for kids.", "/camp"],
  ["Events", "Performances, exhibits, and more.", "/events"],
  ["Shop", "Supplies and Allens Lane goods.", "/shop"],
] as const;

export default function Home() {
  return <SiteFrame>
    <main><section className="hero"><div className="hero-copy"><p className="eyebrow">Allens Lane Art Center</p><h1>Make room for creativity.</h1><p>Discover classes, summer camp, performances, and community arts experiences—all in one place.</p><div className="hero-actions"><Link className="button button-primary" href="/classes">Explore classes</Link><Link className="button button-secondary" href="/events">See events</Link></div></div><div className="hero-art" aria-hidden="true"><span>ART<br />LIVES<br />HERE</span></div></section><section className="pathways"><p className="eyebrow">Choose your experience</p><h2>Find your way into the arts.</h2><div className="pathway-grid">{pathways.map(([title, detail, href]) => <Link href={href} key={title}><strong>{title}</strong><span>{detail}</span></Link>)}</div></section></main>
  </SiteFrame>;
}
