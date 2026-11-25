import Link from "next/link";
import { notFound } from "next/navigation";
import { CartAddButton } from "@/components/cart";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice, getPublishedClassBySlug } from "@/lib/catalog";
import { getPublishedInstructorByName } from "@/lib/instructors";

export const instant = false;

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getPublishedClassBySlug(slug);
  if (!item) notFound();
  const metadata = item.metadata as {
    course_code?: string;
    instructor?: string;
    schedule_text?: string;
    time_text?: string;
    member_price_cents?: number;
    materials_fee_cents?: number;
    availability?: string;
  };
  const instructor = metadata.instructor
    ? await getPublishedInstructorByName(metadata.instructor)
    : null;
  const memberPrice =
    typeof metadata.member_price_cents === "number"
      ? formatPrice(metadata.member_price_cents)
      : null;
  const materials =
    typeof metadata.materials_fee_cents === "number" &&
    metadata.materials_fee_cents > 0
      ? formatPrice(metadata.materials_fee_cents)
      : null;
  return (
    <SiteFrame>
      <main className="class-detail">
        <Link className="browse-link" href="/classes">
          ← All classes
        </Link>
        <div className="class-detail-layout">
          <section>
            <p className="eyebrow">
              {item.audience ?? "All ages"} ·{" "}
              {metadata.course_code ?? "Allens Lane class"}
            </p>
            <h1>{item.title}</h1>
            {metadata.instructor ? (
              <p className="class-detail-instructor">
                With{" "}
                {instructor ? (
                  <Link href={`/instructors/${instructor.slug}`}>
                    {metadata.instructor}
                  </Link>
                ) : (
                  metadata.instructor
                )}
              </p>
            ) : null}
            <p className="class-detail-description">
              {item.description ??
                item.short_description ??
                "Contact Allens Lane Art Center for additional class information."}
            </p>
            <dl>
              <dt>When</dt>
              <dd>
                {[metadata.schedule_text, metadata.time_text]
                  .filter(Boolean)
                  .join(" · ") ||
                  [item.starts_on, item.ends_on].filter(Boolean).join(" – ") ||
                  "Schedule available from Allens Lane Art Center"}
              </dd>
              <dt>Where</dt>
              <dd>{item.location ?? "Allens Lane Art Center"}</dd>
              {item.capacity ? (
                <>
                  <dt>Capacity</dt>
                  <dd>{item.capacity} students</dd>
                </>
              ) : null}
            </dl>
          </section>
          <aside>
            <p className="eyebrow">Tuition</p>
            <strong>{formatPrice(item.price_cents)}</strong>
            {memberPrice ? <p>Members: {memberPrice}</p> : null}
            {materials ? <p>Materials fee: {materials}</p> : null}
            {metadata.availability === "waitlist" ? (
              <a
                className="button button-primary"
                href={`mailto:info@allenslane.org?subject=${encodeURIComponent(`Waitlist request: ${item.title}`)}`}
              >
                Join waitlist
              </a>
            ) : metadata.availability === "info" ? (
              <a className="button" href="mailto:info@allenslane.org">
                Contact us
              </a>
            ) : (
              <CartAddButton
                item={{
                  id: item.id,
                  title: item.title,
                  itemType: "class",
                  priceCents: item.price_cents,
                }}
                label="Add class"
              />
            )}
          </aside>
        </div>
      </main>
    </SiteFrame>
  );
}
