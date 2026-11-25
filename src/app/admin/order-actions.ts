"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function requireStaff(next = "/admin/orders") {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", claims.claims.sub)
    .maybeSingle();
  if (!role) redirect("/admin");
  return supabase;
}

export async function updateOrderFulfillment(formData: FormData) {
  const orderId = value(formData, "orderId");
  const fulfillmentStatus = value(formData, "fulfillmentStatus");
  if (
    !orderId ||
    ![
      "unfulfilled",
      "processing",
      "ready_for_pickup",
      "shipped",
      "completed",
      "cancelled",
    ].includes(fulfillmentStatus)
  )
    redirect("/admin/orders?error=Choose+a+valid+fulfillment+status.");
  const supabase = await requireStaff();
  const { error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: fulfillmentStatus,
      fulfillment_note: value(formData, "fulfillmentNote") || null,
      tracking_number: value(formData, "trackingNumber") || null,
      fulfilled_at: ["shipped", "completed", "ready_for_pickup"].includes(
        fulfillmentStatus,
      )
        ? new Date().toISOString()
        : null,
    })
    .eq("id", orderId)
    .eq("status", "paid");
  if (error)
    redirect(`/admin/orders?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  redirect("/admin/orders?message=Fulfillment+status+updated");
}

export async function refundCommerceOrder(formData: FormData) {
  const orderId = value(formData, "orderId");
  if (!orderId) redirect("/admin/orders?error=Order+not+found.");
  const supabase = await requireStaff();
  const { data: order } = await supabase
    .from("orders")
    .select("id,status,stripe_payment_intent_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid" || !order.stripe_payment_intent_id)
    redirect(
      "/admin/orders?error=Only+paid+orders+with+a+Stripe+payment+can+be+refunded.",
    );
  try {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: order.stripe_payment_intent_id,
        metadata: { allens_lane_order_id: order.id },
      },
      { idempotencyKey: `allens-lane-order-refund-${order.id}` },
    );
    const { error } = await supabase
      .from("orders")
      .update({
        status: refund.status === "succeeded" ? "refunded" : "refund_pending",
        fulfillment_status: "cancelled",
        refunded_at:
          refund.status === "succeeded" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "paid");
    if (error) throw error;
  } catch (error) {
    redirect(
      `/admin/orders?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to request the refund.")}`,
    );
  }
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  redirect("/admin/orders?message=Refund+requested+through+Stripe");
}

export async function refundTicketOrder(formData: FormData) {
  const orderId = value(formData, "orderId");
  if (!orderId) redirect("/admin/ticket-orders?error=Ticket+order+not+found.");
  const supabase = await requireStaff("/admin/ticket-orders");
  const { data: order } = await supabase
    .from("ticket_orders")
    .select("id,status,stripe_payment_intent_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid" || !order.stripe_payment_intent_id)
    redirect("/admin/ticket-orders?error=Only+paid+ticket+orders+with+a+Stripe+payment+can+be+refunded.");
  const { count: checkedInCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("ticket_order_id", order.id)
    .eq("status", "checked_in");
  if (checkedInCount)
    redirect("/admin/ticket-orders?error=Tickets+that+have+been+checked+in+cannot+be+refunded+from+the+portal.");

  try {
    const refund = await getStripe().refunds.create(
      { payment_intent: order.stripe_payment_intent_id, metadata: { allens_lane_ticket_order_id: order.id } },
      { idempotencyKey: `allens-lane-ticket-refund-${order.id}` },
    );
    const admin = createAdminClient();
    if (refund.status === "succeeded") {
      const { data, error } = await admin.rpc("finalize_ticket_order_refund", { p_ticket_order_id: order.id });
      if (error || data !== "refunded") throw new Error(error?.message ?? "Unable to finalize the ticket refund.");
    } else if (refund.status === "pending" || refund.status === "requires_action") {
      const { error: orderError } = await admin.from("ticket_orders").update({ status: "refund_pending", updated_at: new Date().toISOString() }).eq("id", order.id).eq("status", "paid");
      if (orderError) throw orderError;
      const { error: ticketError } = await admin.from("tickets").update({ status: "cancelled" }).eq("ticket_order_id", order.id).eq("status", "issued");
      if (ticketError) throw ticketError;
    } else {
      throw new Error("Stripe was unable to create the ticket refund.");
    }
  } catch (error) {
    redirect(`/admin/ticket-orders?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to request the ticket refund.")}`);
  }
  revalidatePath("/admin/ticket-orders");
  revalidatePath("/admin/reports");
  revalidatePath("/account");
  redirect("/admin/ticket-orders?message=Ticket+refund+requested+through+Stripe");
}
