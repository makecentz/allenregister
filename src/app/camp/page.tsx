import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedCatalogItems } from "@/lib/catalog";
import { CartAddButton } from "@/components/cart";
import Link from "next/link";

export const instant = false;

export default async function CampPage() {
  const camps = await getPublishedCatalogItems("camp");
  const items = camps.map((item, index) => ({
    id: item.id,
    slug: item.slug,
    audience: item.audience ?? "Youth",
    title: item.title,
    detail:
      [item.starts_on, item.ends_on, item.location]
        .filter(Boolean)
        .join(" · ") ||
        item.short_description ||
        "See camp details for schedule and location.",
    price: formatPrice(item.price_cents),
    priceCents: item.price_cents,
    tone: ["red", "sun", "violet", "clay"][index % 4],
  }));
  return (
    <SiteFrame>
      <main className="catalog-page">
        <section className="catalog-intro">
          <p className="eyebrow">Summer camp</p>
          <h1>Make summer more creative.</h1>
          <p>
            Allens Lane Summer Art Camp is a creative experience for campers
            ages 5–12, with fresh workshops, mediums, and themes each week.
          </p>
        </section>
        <section className="camp-overview">
          <div>
            <strong>Summer 2026</strong>
            <span>June 15 – August 7</span>
          </div>
          <div>
            <strong>Camp day</strong>
            <span>9:30 AM – 3:30 PM</span>
          </div>
          <div>
            <strong>Before care</strong>
            <span>8:30 – 9:30 AM included</span>
          </div>
          <div>
            <strong>Aftercare</strong>
            <span>3:30 – 5:30 PM · weekly option</span>
          </div>
        </section>
        {items.length ? (
          <section className="class-list" aria-label="Summer camp offerings">
            {items.map((item) => (
              <article className="class-card" key={item.id}>
                <div className={`class-art ${item.tone}`} aria-hidden="true">
                  {item.audience}
                </div>
                <div className="class-card-copy">
                  <p className="eyebrow">{item.audience}</p>
                  <h2>
                    <Link href={`/camp/${item.slug}`}>{item.title}</Link>
                  </h2>
                  <p>{item.detail}</p>
                  <div>
                    <strong>{item.price}</strong>
                    <Link className="text-link" href={`/camp/${item.slug}`}>
                      Details →
                    </Link>
                    <CartAddButton
                      item={{
                        id: item.id,
                        title: item.title,
                        itemType: "camp",
                        priceCents: item.priceCents,
                      }}
                      label="Add camp"
                    />
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="camp-empty">
            <h2>No camp sessions are currently listed.</h2>
            <p>
              Contact Allens Lane Art Center for current summer program information.
            </p>
          </section>
        )}
      </main>
    </SiteFrame>
  );
}
