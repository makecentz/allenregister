"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function beginGiftCertificateCheckout(formData: FormData) {
  const amountCents = Math.round(
    Number(String(formData.get("amount") ?? "0")) * 100,
  );
  const recipientName = String(formData.get("recipientName") ?? "")
    .trim()
    .slice(0, 120);
  const recipientEmail = String(formData.get("recipientEmail") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 255);
  const message = String(formData.get("message") ?? "")
    .trim()
    .slice(0, 500);
  if (!Number.isInteger(amountCents) || amountCents < 100 || !recipientName)
    redirect(
      "/gift-certificates?error=Enter+a+recipient+and+a+gift+of+at+least+$1.00.",
    );
  if (recipientEmail && !/^\S+@\S+\.\S+$/.test(recipientEmail))
    redirect(
      "/gift-certificates?error=Enter+a+valid+recipient+email+or+leave+it+blank.",
    );
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/gift-certificates");
  const code = `ALAC-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const { data: certificate, error } = await supabase
    .from("gift_certificates")
    .insert({
      purchaser_id: user.sub,
      recipient_name: recipientName,
      recipient_email: recipientEmail || null,
      message: message || null,
      code,
      initial_amount_cents: amountCents,
      balance_cents: amountCents,
    })
    .select("id")
    .single();
  if (error || !certificate)
    redirect(
      `/gift-certificates?error=${encodeURIComponent(error?.message ?? "Unable to save your gift certificate.")}`,
    );
  const origin = (await headers()).get("origin");
  if (!origin) redirect("/gift-certificates?error=Unable+to+start+checkout.");
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: certificate.id,
      metadata: {
        gift_certificate_id: certificate.id,
        account_id: user.sub,
        order_type: "gift_certificate",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Allens Lane gift certificate for ${recipientName}`,
              description: recipientEmail
                ? `Recipient: ${recipientEmail}`
                : undefined,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gift-certificates?message=Gift+certificate+checkout+was+cancelled.`,
    });
    if (!session.url)
      redirect(
        "/gift-certificates?error=Stripe+did+not+return+a+checkout+URL.",
      );
    redirect(session.url);
  } catch {
    redirect(
      "/gift-certificates?error=Unable+to+start+Stripe+Checkout.+Please+try+again.",
    );
  }
}
