import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret)
    return new NextResponse("Webhook is not configured", { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const registrationId = session.metadata?.registration_id;
    if (registrationId && session.payment_status === "paid") {
      try {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const { error } = await createAdminClient()
          .from("registrations")
          .update({
            status: "confirmed",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", registrationId)
          .eq("status", "draft");
        if (error)
          return new NextResponse("Unable to confirm registration", {
            status: 500,
          });
      } catch {
        return new NextResponse("Unable to confirm registration", {
          status: 500,
        });
      }
    }
    const orderId = session.metadata?.order_id;
    if (orderId && session.payment_status === "paid") {
      try {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const { data, error } = await createAdminClient().rpc(
          "complete_product_order_payment",
          {
            checkout_order_id: orderId,
            checkout_session_id: session.id,
            payment_intent_id: paymentIntentId,
          },
        );
        if (
          error ||
          !["paid", "already_processed", "inventory_issue"].includes(
            String(data),
          )
        )
          return new NextResponse("Unable to complete product order", {
            status: 500,
          });
      } catch {
        return new NextResponse("Unable to complete product order", {
          status: 500,
        });
      }
    }
    const ticketOrderId = session.metadata?.ticket_order_id;
    if (ticketOrderId && session.payment_status === "paid") {
      try {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const { data, error } = await createAdminClient().rpc(
          "complete_ticket_order_payment",
          {
            checkout_order_id: ticketOrderId,
            checkout_session_id: session.id,
            payment_intent_id: paymentIntentId,
          },
        );
        if (
          error ||
          !["paid", "already_processed", "inventory_issue"].includes(
            String(data),
          )
        )
          return new NextResponse("Unable to issue tickets", { status: 500 });
      } catch {
        return new NextResponse("Unable to issue tickets", { status: 500 });
      }
    }
    const donationId = session.metadata?.donation_id;
    if (donationId && session.payment_status === "paid") {
      try {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const { error } = await createAdminClient()
          .from("donations")
          .update({
            status: "paid",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", donationId)
          .eq("status", "pending_payment");
        if (error)
          return new NextResponse("Unable to complete donation", {
            status: 500,
          });
      } catch {
        return new NextResponse("Unable to complete donation", { status: 500 });
      }
    }
    const giftCertificateId = session.metadata?.gift_certificate_id;
    if (giftCertificateId && session.payment_status === "paid") {
      try {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const { error } = await createAdminClient()
          .from("gift_certificates")
          .update({
            status: "issued",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", giftCertificateId)
          .eq("status", "pending_payment");
        if (error)
          return new NextResponse("Unable to issue gift certificate", {
            status: 500,
          });
      } catch {
        return new NextResponse("Unable to issue gift certificate", {
          status: 500,
        });
      }
    }
  }
  return NextResponse.json({ received: true });
}
