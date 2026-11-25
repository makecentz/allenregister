import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { getPublicEvents } from "@/lib/events";

export const instant = false;

const dateParts = (value?: string) =>
  value
    ? {
        month: new Intl.DateTimeFormat("en-US", { month: "short" })
          .format(new Date(value))
          .toUpperCase(),
        day: String(new Date(value).getDate()),
      }
    : { month: "TBD", day: "—" };

export default async function EventsPage() {
  const events = await getPublicEvents();
  return (
    <SiteFrame>
      <main className="catalog-page">
        <section className="catalog-intro">
          <p className="eyebrow">Live at the Lane</p>
          <h1>Events & performances.</h1>
          <p>
            Gather for theatre, music, exhibitions, workshops, and joyful
            community moments.
          </p>
        </section>
        {events.length ? (
          <section className="event-list" aria-label="Upcoming events">
            {events.map((event) => {
              const session = event.sessions[0];
              const date = dateParts(session?.starts_at);
              const price = session?.ticket_types.length
                ? Math.min(
                    ...session.ticket_types.map((tier) => tier.price_cents),
                  )
                : null;
              return (
                <article className="event-row" key={event.id}>
                  <div className="event-date">
                    <span>{date.month}</span>
                    <strong>{date.day}</strong>
                  </div>
                  <div className="event-details">
                    <p className="eyebrow">{event.audience ?? "Event"}</p>
                    <h2>
                      <Link href={`/events/${event.slug}`}>{event.title}</Link>
                    </h2>
                    <p>
                      {session
                        ? `${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(session.starts_at))} · ${session.location ?? event.location ?? "Allens Lane Art Center"}`
                        : (event.short_description ?? "See event details for complete information.")}
                    </p>
                  </div>
                  <div className="event-action">
                    <strong>
                      {price === null
                        ? "View details"
                        : price === 0
                          ? "Free"
                          : `From $${(price / 100).toFixed(2)}`}
                    </strong>
                    <Link
                      className="button button-primary"
                      href={`/events/${event.slug}`}
                    >
                      Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="camp-empty">
            <h2>No events are currently listed.</h2>
            <p>
              Contact Allens Lane Art Center for current performance and community event information.
            </p>
          </section>
        )}
      </main>
    </SiteFrame>
  );
}
