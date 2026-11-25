import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { joinWaitlist } from "@/app/waitlist/actions";

export const instant = false;

export default async function WaitlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { itemId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("catalog_items")
    .select("id,title,item_type,short_description,location,price_cents")
    .eq("id", itemId)
    .eq("status", "published")
    .in("item_type", ["class", "camp"])
    .maybeSingle();
  if (!item) notFound();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect(`/signup?next=/waitlist/${itemId}`);
  const { data: participants } = await supabase
    .from("participants")
    .select("id,first_name,last_name,birth_date")
    .eq("account_id", claimsData.claims.sub)
    .order("first_name");

  return (
    <SiteFrame>
      <main className="registration-page">
        <Link href={item.item_type === "camp" ? "/camp" : "/classes"}>
          ← Back to {item.item_type === "camp" ? "summer camp" : "classes"}
        </Link>
        <div className="registration-layout">
          <section className="registration-summary">
            <p className="eyebrow">Waitlist</p>
            <h1>{item.title}</h1>
            <p>{item.short_description}</p>
            <dl>
              <dt>Location</dt>
              <dd>{item.location ?? "Allens Lane Art Center"}</dd>
              <dt>Tuition</dt>
              <dd>{formatPrice(item.price_cents)}</dd>
            </dl>
          </section>
          <section className="registration-form">
            <p className="eyebrow">Reserve your place in line</p>
            <h2>Who should we add?</h2>
            <p>
              Select someone in your household, or add a participant. Staff will
              contact you when a space becomes available.
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            <form action={joinWaitlist}>
              <input name="itemId" type="hidden" value={item.id} />
              {participants?.length ? (
                <label>
                  Saved participant
                  <select defaultValue="" name="participantId">
                    <option value="">Add a new participant below</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.first_name} {participant.last_name}
                        {participant.birth_date
                          ? ` · ${participant.birth_date}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                First name
                <input autoComplete="given-name" name="firstName" />
              </label>
              <label>
                Last name
                <input autoComplete="family-name" name="lastName" />
              </label>
              <label>
                Date of birth <span>(recommended for youth programs)</span>
                <input name="birthDate" type="date" />
              </label>
              <button className="button button-primary">Join waitlist</button>
            </form>
          </section>
        </div>
      </main>
    </SiteFrame>
  );
}
