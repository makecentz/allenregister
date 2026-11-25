import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { joinWaitlist } from "@/app/waitlist/actions";
import { ParticipantPicker } from "@/components/participant-picker";
import { accountHolderName } from "@/lib/participants";

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
              <button className="button button-primary">Join waitlist</button>
            </form>
          </section>
        </div>
      </main>
    </SiteFrame>
  );
}
