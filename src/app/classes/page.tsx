import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedCatalogItems } from "@/lib/catalog";
import { CartAddButton } from "@/components/cart";

export const instant = false;

const classes = [
  { audience: "Adults", title: "Tuesday Morning Pottery: Handbuilding with Function", detail: "Tuesdays · 10:00 AM–1:00 PM · 8 sessions", price: "$315", tone: "clay" },
  { audience: "Adults", title: "Introduction to Wheel Throwing", detail: "Tuesdays · 6:30–9:30 PM · 9 sessions", price: "$340", tone: "sun" },
  { audience: "All ages", title: "Ceramics Open Studio", detail: "Tuesdays · 1:00–4:00 PM · 9 sessions", price: "$185", tone: "violet" },
  { audience: "Youth", title: "After School Studio: Youth Theater", detail: "Tuesdays · 4:00–5:30 PM · 8 sessions", price: "$120", tone: "red" },
] as const;

export default async function ClassesPage() {
  const publishedClasses = await getPublishedCatalogItems("class");
  const items = publishedClasses.length ? publishedClasses.map((item, index) => ({ id: item.id, audience: item.audience ?? "All ages", title: item.title, detail: [item.starts_on, item.location].filter(Boolean).join(" · ") || item.short_description || "Details coming soon", price: formatPrice(item.price_cents), priceCents: item.price_cents, tone: ["clay", "sun", "violet", "red"][index % 4] })) : classes.map((item) => ({ ...item, id: null, priceCents: 0 }));
  return <SiteFrame><main className="catalog-page">
    <section className="catalog-intro"><p className="eyebrow">Registration</p><h1>Classes for every maker.</h1><p>Find a class that fits your practice, your schedule, and your curiosity.</p></section>
    <section className="catalog-tools" aria-label="Class filters"><button className="filter-pill">All programs</button><button className="filter-pill">Adults</button><button className="filter-pill">Youth</button><button className="filter-pill">Ceramics</button></section>
    <section className="class-list" aria-label="Available classes">{items.map((item) => <article className="class-card" key={item.title}>
      <div className={`class-art ${item.tone}`} aria-hidden="true">{item.audience}</div>
      <div className="class-card-copy"><p className="eyebrow">{item.audience}</p><h2>{item.title}</h2><p>{item.detail}</p><div><strong>{item.price}</strong><CartAddButton item={item.id ? { id: item.id, title: item.title, itemType: "class", priceCents: item.priceCents } : null} label="Add class" /></div></div>
    </article>)}</section>
  </main></SiteFrame>;
}
