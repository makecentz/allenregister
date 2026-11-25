"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function requireStaff() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=/admin/orders");
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
