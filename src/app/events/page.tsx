import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedCatalogItems } from "@/lib/catalog";

export const instant = false;

const events = [
  { month: "DEC", day: "12", type: "Performance", title: "A Very Pretzel Holiday Cabaret", detail: "Saturday, December 12 · 7:00 PM · Allens Lane Theater", price: "From $20" },
  { month: "DEC", day: "13", type: "Performance", title: "A Very Pretzel Holiday Cabaret", detail: "Sunday, December 13 · 2:00 PM · Allens Lane Theater", price: "From $20" },
  { month: "JAN", day: "09", type: "Community", title: "First Friday: Art Is Magic", detail: "Friday, January 9 · 6:00 PM · Main Gallery", price: "Free" },
  { month: "JAN", day: "24", type: "Workshop", title: "Family Clay Day", detail: "Saturday, January 24 · 1:00 PM · Ceramics Studio", price: "$15" },
] as const;

export default async function EventsPage() {
  const publishedEvents = await getPublishedCatalogItems("event");
  const items = publishedEvents.length ? publishedEvents.map((item) => {
    const date = item.starts_on ? new Date(`${item.starts_on}T12:00:00`) : null;
    return { month: date ? new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase() : "TBD", day: date ? String(date.getDate()) : "—", type: item.audience ?? "Event", title: item.title, detail: [item.starts_on, item.location].filter(Boolean).join(" · ") || item.short_description || "Details coming soon", price: formatPrice(item.price_cents) };
  }) : events;
  return <SiteFrame><main className="catalog-page">
    <section className="catalog-intro"><p className="eyebrow">Live at the Lane</p><h1>Events & performances.</h1><p>Gather for theatre, music, exhibitions, workshops, and joyful community moments.</p></section>
    <section className="event-list" aria-label="Upcoming events">{items.map((event) => <article className="event-row" key={`${event.month}-${event.day}-${event.detail}`}>
      <div className="event-date"><span>{event.month}</span><strong>{event.day}</strong></div>
      <div className="event-details"><p className="eyebrow">{event.type}</p><h2>{event.title}</h2><p>{event.detail}</p></div>
      <div className="event-action"><strong>{event.price}</strong><Link className="button button-primary" href="/signup?next=/events">Details</Link></div>
    </article>)}</section>
  </main></SiteFrame>;
}
