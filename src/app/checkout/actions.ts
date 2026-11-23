"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function beginRegistrationCheckout(formData: FormData) {
  const registrationId = String(formData.get("registrationId") ?? "");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/account");

  const { data: registration } = await supabase.from("registrations").select("id,status,price_cents,catalog_items(title,short_description)").eq("id", registrationId).eq("account_id", user.sub).maybeSingle();
  if (!registration || registration.status !== "draft") redirect("/account?error=This+registration+is+not+available+for+checkout.");

  const item = registration.catalog_items as { title?: string; short_description?: string | null } | null;
  const origin = (await headers()).get("origin");
  if (!origin) redirect("/account?error=Unable+to+start+checkout.");

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: registration.id,
      metadata: { registration_id: registration.id, account_id: user.sub },
      line_items: [{ price_data: { currency: "usd", product_data: { name: item?.title ?? "Allens Lane registration", description: item?.short_description ?? undefined }, unit_amount: registration.price_cents }, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account?message=Checkout+was+cancelled.+Your+registration+draft+is+saved.`,
    });
    if (!session.url) redirect("/account?error=Stripe+did+not+return+a+checkout+URL.");
    redirect(session.url);
  } catch {
    redirect("/account?error=Unable+to+start+Stripe+Checkout.+Please+try+again.");
  }
}
