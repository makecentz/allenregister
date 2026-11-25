"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function beginDonationCheckout(formData: FormData) {
  const amountCents = Math.round(
    Number(String(formData.get("amount") ?? "0")) * 100,
  );
  const fundId = String(formData.get("fundId") ?? "");
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 500);
  const monthly = String(formData.get("frequency") ?? "") === "monthly";
  if (!Number.isInteger(amountCents) || amountCents < 100)
    redirect("/donate?error=Please+enter+a+gift+of+at+least+$1.00.");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/donate");
  const { data: fund } = fundId
    ? await supabase
        .from("donation_funds")
        .select("id,name")
        .eq("id", fundId)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null };
  if (fundId && !fund)
    redirect("/donate?error=Choose+an+active+donation+fund.");
  const { data: donation, error } = await supabase
    .from("donations")
    .insert({
      account_id: user.sub,
      donation_fund_id: fund?.id ?? null,
      amount_cents: amountCents,
      note: note || null,
      frequency: monthly ? "monthly" : "one_time",
    })
    .select("id")
    .single();
  if (error || !donation)
    redirect(
      `/donate?error=${encodeURIComponent(error?.message ?? "Unable to save your donation.")}`,
    );
  const origin = (await headers()).get("origin");
  if (!origin) redirect("/donate?error=Unable+to+start+checkout.");
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: monthly ? "subscription" : "payment",
      customer_email: user.email,
      client_reference_id: donation.id,
      metadata: {
        donation_id: donation.id,
        account_id: user.sub,
        order_type: "donation",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: fund?.name
                ? `Donation: ${fund.name}`
                : "Donation to Allens Lane Art Center",
              description: note || undefined,
            },
            unit_amount: amountCents,
            recurring: monthly ? { interval: "month" } : undefined,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate?message=Donation+checkout+was+cancelled.`,
    });
    if (!session.url)
      redirect("/donate?error=Stripe+did+not+return+a+checkout+URL.");
    redirect(session.url);
  } catch {
    redirect(
      "/donate?error=Unable+to+start+Stripe+Checkout.+Please+try+again.",
    );
  }
}
