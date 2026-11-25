import { NextResponse } from "next/server";
import Stripe from "stripe";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

function sessionEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email ?? session.customer_email;
}

async function sendPurchaseEmail(
  session: Stripe.Checkout.Session,
  subject: string,
  message: string,
) {
  await sendTransactionalEmail({
    to: sessionEmail(session),
    subject,
    html: `<p>${escapeEmailHtml(message)}</p><p>You can review your purchases and registrations from your Allens Lane account.</p>`,
    text: `${message}\n\nYou can review your purchases and registrations from your Allens Lane account.`,
  });
}

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
    const settled =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";
    const registrationId = session.metadata?.registration_id;
    if (registrationId && settled) {
      try {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        const { data: confirmedRegistration, error } = await createAdminClient()
          .from("registrations")
          .update({
            status: "confirmed",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("id", registrationId)
          .eq("status", "pending_payment")
          .select("account_id,catalog_item_id,participant_id")
          .maybeSingle();
        if (error)
          return new NextResponse("Unable to confirm registration", {
            status: 500,
          });
        const { error: giftError } = await createAdminClient().rpc(
          "finalize_gift_certificate_redemption",
          { p_order_id: null, p_registration_id: registrationId },
        );
        if (giftError)
          return new NextResponse("Unable to apply gift certificate", {
            status: 500,
          });
        if (confirmedRegistration) {
          await createAdminClient()
            .from("waitlist_entries")
            .update({
              status: "enrolled",
              updated_at: new Date().toISOString(),
            })
            .eq("account_id", confirmedRegistration.account_id)
            .eq("catalog_item_id", confirmedRegistration.catalog_item_id)
            .eq("participant_id", confirmedRegistration.participant_id)
            .eq("status", "offered");
          await sendPurchaseEmail(
            session,
            "Your Allens Lane registration is confirmed",
            "Thank you — your registration has been confirmed.",
          );
        }
      } catch {
        return new NextResponse("Unable to confirm registration", {
          status: 500,
        });
      }
    }
    const orderId = session.metadata?.order_id;
    if (orderId && settled) {
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
        if (String(data) === "inventory_issue") {
          await createAdminClient().rpc("release_gift_certificate_redemption", {
            p_order_id: orderId,
            p_registration_id: null,
          });
        } else {
          const { error: giftError } = await createAdminClient().rpc(
            "finalize_gift_certificate_redemption",
            { p_order_id: orderId, p_registration_id: null },
          );
          if (giftError)
            return new NextResponse("Unable to apply gift certificate", {
              status: 500,
            });
          if (String(data) === "paid")
            await sendPurchaseEmail(
              session,
              "Your Allens Lane order is confirmed",
              "Thank you — your shop order has been confirmed.",
            );
        }
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
        if (String(data) === "paid")
          await sendPurchaseEmail(
            session,
            "Your Allens Lane tickets are confirmed",
            "Thank you — your event tickets have been issued.",
          );
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
        const { data: completedDonation, error } = await createAdminClient()
          .from("donations")
          .update({
            status: "paid",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : (session.subscription?.id ?? null),
            updated_at: new Date().toISOString(),
          })
          .eq("id", donationId)
          .eq("status", "pending_payment")
          .select("id")
          .maybeSingle();
        if (error)
          return new NextResponse("Unable to complete donation", {
            status: 500,
          });
        if (completedDonation)
          await sendPurchaseEmail(
            session,
            "Thank you for supporting Allens Lane",
            "Thank you for your donation to Allens Lane Art Center.",
          );
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
        const { data: issuedCertificate, error } = await createAdminClient()
          .from("gift_certificates")
          .update({
            status: "issued",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", giftCertificateId)
          .eq("status", "pending_payment")
          .select("recipient_email,recipient_name,code")
          .maybeSingle();
        if (error)
          return new NextResponse("Unable to issue gift certificate", {
            status: 500,
          });
        if (issuedCertificate) {
          const recipient =
            issuedCertificate.recipient_email ?? sessionEmail(session);
          await sendTransactionalEmail({
            to: recipient,
            subject: "You received an Allens Lane gift certificate",
            html: `<p>${escapeEmailHtml(issuedCertificate.recipient_name ? `Hello ${issuedCertificate.recipient_name},` : "Hello,")}</p><p>You received an Allens Lane Art Center gift certificate.</p><p>Your code is <strong>${escapeEmailHtml(issuedCertificate.code)}</strong>.</p>`,
            text: `${issuedCertificate.recipient_name ? `Hello ${issuedCertificate.recipient_name}, ` : ""}You received an Allens Lane Art Center gift certificate. Your code is ${issuedCertificate.code}.`,
          });
        }
      } catch {
        return new NextResponse("Unable to issue gift certificate", {
          status: 500,
        });
      }
    }
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const registrationId = session.metadata?.registration_id;
    const orderId = session.metadata?.order_id;
    if (registrationId) {
      await createAdminClient()
        .from("registrations")
        .update({
          status: "draft",
          checkout_expires_at: null,
          stripe_checkout_session_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("status", "pending_payment")
        .eq("stripe_checkout_session_id", session.id);
      await createAdminClient().rpc("release_gift_certificate_redemption", {
        p_order_id: null,
        p_registration_id: registrationId,
      });
    }
    if (orderId) {
      await createAdminClient()
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", "pending_payment")
        .eq("stripe_checkout_session_id", session.id);
      await createAdminClient().rpc("release_gift_certificate_redemption", {
        p_order_id: orderId,
        p_registration_id: null,
      });
    }
  }
  if (event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    const paymentIntentId =
      typeof refund.payment_intent === "string"
        ? refund.payment_intent
        : refund.payment_intent?.id;
    if (paymentIntentId && refund.status === "succeeded") {
      await createAdminClient()
        .from("orders")
        .update({
          status: "refunded",
          fulfillment_status: "cancelled",
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", paymentIntentId)
        .eq("status", "refund_pending");
    }
  }
  return NextResponse.json({ received: true });
}
