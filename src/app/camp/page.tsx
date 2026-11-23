import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedCatalogItems } from "@/lib/catalog";

export const instant = false;

const fallbackCamp = [{ audience: "Youth", title: "Summer Art Camp", detail: "Creative weeks for young makers · Registration opening soon", price: "Coming soon", tone: "red", href: "/signup?next=/camp" }] as const;

export default async function CampPage() {
  const camps = await getPublishedCatalogItems("camp");
  const items = camps.length ? camps.map((item, index) => ({ audience: item.audience ?? "Youth", title: item.title, detail: [item.starts_on, item.ends_on, item.location].filter(Boolean).join(" · ") || item.short_description || "Details coming soon", price: formatPrice(item.price_cents), tone: ["red", "sun", "violet", "clay"][index % 4], href: `/register/${item.id}` })) : fallbackCamp;
  return <SiteFrame><main className="catalog-page"><section className="catalog-intro"><p className="eyebrow">Summer camp</p><h1>Make summer more creative.</h1><p>Explore joyful arts weeks designed for young makers and their big imaginations.</p></section><section className="class-list" aria-label="Summer camp offerings">{items.map((item) => <article className="class-card" key={item.title}><div className={`class-art ${item.tone}`} aria-hidden="true">{item.audience}</div><div className="class-card-copy"><p className="eyebrow">{item.audience}</p><h2>{item.title}</h2><p>{item.detail}</p><div><strong>{item.price}</strong><Link className="button button-primary" href={item.href}>View camp</Link></div></div></article>)}</section></main></SiteFrame>;
}
