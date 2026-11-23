import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedCatalogItems } from "@/lib/catalog";
import { CartAddButton } from "@/components/cart";

export const instant = false;

const fallbackCamp = [{ audience: "Youth", title: "Summer Art Camp", detail: "Creative weeks for young makers · Registration opening soon", price: "Coming soon", tone: "red", id: null, priceCents: 0 }] as const;

export default async function CampPage() {
  const camps = await getPublishedCatalogItems("camp");
  const items = camps.length ? camps.map((item, index) => ({ id: item.id, audience: item.audience ?? "Youth", title: item.title, detail: [item.starts_on, item.ends_on, item.location].filter(Boolean).join(" · ") || item.short_description || "Details coming soon", price: formatPrice(item.price_cents), priceCents: item.price_cents, tone: ["red", "sun", "violet", "clay"][index % 4] })) : fallbackCamp;
  return <SiteFrame><main className="catalog-page"><section className="catalog-intro"><p className="eyebrow">Summer camp</p><h1>Make summer more creative.</h1><p>Explore joyful arts weeks designed for young makers and their big imaginations.</p></section><section className="class-list" aria-label="Summer camp offerings">{items.map((item) => <article className="class-card" key={item.title}><div className={`class-art ${item.tone}`} aria-hidden="true">{item.audience}</div><div className="class-card-copy"><p className="eyebrow">{item.audience}</p><h2>{item.title}</h2><p>{item.detail}</p><div><strong>{item.price}</strong><CartAddButton item={item.id ? { id: item.id, title: item.title, itemType: "camp", priceCents: item.priceCents } : null} label="Add camp" /></div></div></article>)}</section></main></SiteFrame>;
}
