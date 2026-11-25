import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { startRegistration } from "@/app/register/actions";
import { ParticipantPicker } from "@/components/participant-picker";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/catalog";
import { accountHolderName } from "@/lib/participants";

export const instant = false;

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{
    error?: string;
    next?: string;
    waitlistEntry?: string;
  }>;
}) {
  const { itemId } = await params;
  const { error, next, waitlistEntry } = await searchParams;
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("catalog_items")
    .select(
      "id,title,item_type,short_description,audience,starts_on,ends_on,location,price_cents",
    )
    .eq("id", itemId)
    .eq("status", "published")
    .in("item_type", ["class", "camp"])
    .maybeSingle();
  if (!item) notFound();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect(`/signup?next=/register/${itemId}`);
  const [{ data: participants }, { data: profile }] = await Promise.all([
    supabase
      .from("participants")
      .select("id,first_name,last_name,birth_date,is_account_holder")
      .eq("account_id", claimsData.claims.sub)
      .order("first_name"),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", claimsData.claims.sub)
      .maybeSingle(),
  ]);
  const userMetadataName =
    typeof claimsData.claims.user_metadata?.full_name === "string"
      ? claimsData.claims.user_metadata.full_name
      : "";
  const accountHolder = accountHolderName(profile?.full_name || userMetadataName);

  return (
    <main className="registration-page">
      <Link href={item.item_type === "camp" ? "/camp" : "/classes"}>
        ← Back to {item.item_type === "camp" ? "summer camp" : "classes"}
      </Link>
      <div className="registration-layout">
        <section className="registration-summary">
          <p className="eyebrow">
            {item.item_type === "camp"
              ? "Summer camp registration"
              : "Class registration"}
          </p>
          <h1>{item.title}</h1>
          <p>{item.short_description}</p>
          <dl>
            <dt>When</dt>
            <dd>
              {[item.starts_on, item.ends_on].filter(Boolean).join(" – ") ||
                "Dates to be announced"}
            </dd>
            <dt>Where</dt>
            <dd>{item.location ?? "Allens Lane Art Center"}</dd>
            <dt>Tuition</dt>
            <dd>{formatPrice(item.price_cents)}</dd>
          </dl>
        </section>
        <section className="registration-form">
          <p className="eyebrow">
            {waitlistEntry ? "Your waitlist offer" : "Step 1 of 2"}
          </p>
          <h2>Who is registering?</h2>
          <p>
            Choose someone from your household, or add a new participant. Your
            registration will be saved as a draft; payment is not collected yet.
          </p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <form action={startRegistration}>
            <input type="hidden" name="catalogItemId" value={item.id} />
            <input
              type="hidden"
              name="next"
              value={next === "/checkout" ? "/checkout" : ""}
            />
            {waitlistEntry ? (
              <input
                type="hidden"
                name="waitlistEntryId"
                value={waitlistEntry}
              />
            ) : null}
            <ParticipantPicker
              accountHolder={accountHolder}
              participants={(participants ?? []).map((participant) => ({
                id: participant.id,
                firstName: participant.first_name,
                lastName: participant.last_name,
                birthDate: participant.birth_date,
                isAccountHolder: participant.is_account_holder,
              }))}
            />
            {item.item_type === "camp" ? (
              <label className="check-label">
                <input
                  name="campWaiverAccepted"
                  type="checkbox"
                  value="yes"
                  required
                />
                I have read and agree to the{" "}
                <Link href="/camp-waiver">Camp Participation Waiver</Link>.
              </label>
            ) : null}
            <button className="button button-primary">Save registration</button>
          </form>
        </section>
      </div>
    </main>
  );
}
