"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function reserveGiftCertificate(
  code: string,
  target: { orderId?: string; registrationId?: string },
) {
  if (!code) return null;
  const { data, error } = await createAdminClient().rpc(
    "reserve_gift_certificate_redemption",
    {
      p_code: code,
      p_order_id: target.orderId ?? null,
      p_registration_id: target.registrationId ?? null,
    },
  );
  const reservation = Array.isArray(data) ? data[0] : null;
  if (error || !reservation?.amount_cents)
    throw new Error(
      error?.message ?? "That gift certificate is not available.",
    );
  return { amountCents: Number(reservation.amount_cents) };
}

async function createGiftDiscount(amountCents: number, code: string) {
  const coupon = await getStripe().coupons.create({
    amount_off: amountCents,
    currency: "usd",
    duration: "once",
    name: `Allens Lane gift certificate ${code.toUpperCase()}`,
  });
  return [{ coupon: coupon.id }];
}

export async function beginRegistrationCheckout(formData: FormData) {
  const registrationId = value(formData, "registrationId");
  const giftCertificateCode = value(formData, "giftCertificateCode");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/account");

  const { data: heldRows, error: holdError } = await supabase.rpc(
    "reserve_registration_for_payment",
    { p_registration_id: registrationId },
  );
  const held = Array.isArray(heldRows) ? heldRows[0] : null;
  if (holdError || !held)
    redirect(
      `/account?error=${encodeURIComponent(holdError?.message ?? "This registration is not available for checkout.")}`,
    );

  if (held.checkout_session_id) {
    try {
      const existingSession = await getStripe().checkout.sessions.retrieve(
        held.checkout_session_id,
      );
      if (existingSession.status === "open" && existingSession.url)
        redirect(existingSession.url);
    } catch {
      // A stale checkout session is safely replaced below.
    }
  }

  const origin = (await headers()).get("origin");
  if (!origin) redirect("/account?error=Unable+to+start+checkout.");

  try {
    const gift = await reserveGiftCertificate(giftCertificateCode, {
      registrationId,
    });
    const discounts = gift
      ? await createGiftDiscount(gift.amountCents, giftCertificateCode)
      : undefined;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: registrationId,
      metadata: { registration_id: registrationId, account_id: user.sub },
      discounts,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: held.title || "Allens Lane registration" },
            unit_amount: held.price_cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account?message=Checkout+was+cancelled.+Your+registration+draft+is+saved.`,
    });
    if (!session.url)
      redirect("/account?error=Stripe+did+not+return+a+checkout+URL.");
    await createAdminClient()
      .from("registrations")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", registrationId)
      .eq("account_id", user.sub)
      .eq("status", "pending_payment");
    redirect(session.url);
  } catch (error) {
    await createAdminClient()
      .from("registrations")
      .update({ status: "draft", checkout_expires_at: null })
      .eq("id", registrationId)
      .eq("account_id", user.sub)
      .eq("status", "pending_payment");
    redirect(
      `/account?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to start Stripe Checkout. Please try again.")}`,
    );
  }
}

type CartPurchasable = {
  id: string;
  itemType: "product" | "membership";
  quantity: number;
};

function cartPurchasable(value: string): CartPurchasable[] | null {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 20) return null;
    const items = parsed
      .filter(
        (item): item is { id: unknown; itemType: unknown; quantity: unknown } =>
          Boolean(item) && typeof item === "object",
      )
      .filter(
        (item) => item.itemType === "product" || item.itemType === "membership",
      )
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : "",
        itemType: item.itemType as "product" | "membership",
        quantity: Number(item.quantity),
      }));
    if (
      !items.length ||
      items.some(
        (item) =>
          !item.id ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99 ||
          (item.itemType === "membership" && item.quantity !== 1),
      )
    )
      return null;
    return items;
  } catch {
    return null;
  }
}

export async function beginProductCheckout(formData: FormData) {
  const requestedItems = cartPurchasable(String(formData.get("cart") ?? ""));
  const giftCertificateCode = value(formData, "giftCertificateCode");
  if (!requestedItems)
    redirect("/cart?error=Your+cart+could+not+be+validated.+Please+try+again.");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/checkout");

  const ids = [...new Set(requestedItems.map((item) => item.id))];
  if (ids.length !== requestedItems.length)
    redirect("/cart?error=Please+remove+duplicate+items+and+try+again.");
  const { data: catalogItems } = await supabase
    .from("catalog_items")
    .select(
      "id,item_type,title,short_description,price_cents,inventory_quantity",
    )
    .in("id", ids)
    .in("item_type", ["product", "membership"])
    .eq("status", "published");
  if (!catalogItems || catalogItems.length !== ids.length)
    redirect("/cart?error=One+or+more+items+are+no+longer+available.");

  const lines = requestedItems.map((requested) => {
    const catalogItem = catalogItems.find((item) => item.id === requested.id);
    if (
      !catalogItem ||
      catalogItem.item_type !== requested.itemType ||
      (catalogItem.item_type === "product" &&
        catalogItem.inventory_quantity !== null &&
        catalogItem.inventory_quantity < requested.quantity)
    )
      return null;
    return { ...catalogItem, quantity: requested.quantity };
  });
  if (lines.some((line) => !line))
    redirect("/cart?error=One+or+more+items+do+not+have+enough+inventory.");
  const orderLines = lines.filter(
    (line): line is NonNullable<typeof line> => line !== null,
  );
  const subtotalCents = orderLines.reduce(
    (total, item) => total + item.price_cents * item.quantity,
    0,
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ account_id: user.sub, subtotal_cents: subtotalCents })
    .select("id")
    .single();
  if (orderError || !order)
    redirect(
      `/cart?error=${encodeURIComponent(orderError?.message ?? "Unable to save your order.")}`,
    );
  const { error: linesError } = await supabase.from("order_items").insert(
    orderLines.map((item) => ({
      order_id: order.id,
      catalog_item_id: item.id,
      title: item.title,
      item_type: item.item_type,
      unit_amount_cents: item.price_cents,
      quantity: item.quantity,
    })),
  );
  if (linesError)
    redirect(`/cart?error=${encodeURIComponent(linesError.message)}`);

  const origin = (await headers()).get("origin");
  if (!origin) redirect("/cart?error=Unable+to+start+checkout.");
  try {
    const gift = await reserveGiftCertificate(giftCertificateCode, {
      orderId: order.id,
    });
    const discounts = gift
      ? await createGiftDiscount(gift.amountCents, giftCertificateCode)
      : undefined;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: {
        order_id: order.id,
        account_id: user.sub,
        order_type: "commerce",
      },
      discounts,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      line_items: orderLines.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.title,
            description: item.short_description ?? undefined,
          },
          unit_amount: item.price_cents,
        },
        quantity: item.quantity,
      })),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?message=Checkout+was+cancelled.+Your+cart+is+still+available.`,
    });
    if (!session.url)
      redirect("/cart?error=Stripe+did+not+return+a+checkout+URL.");
    await createAdminClient()
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id)
      .eq("account_id", user.sub)
      .eq("status", "pending_payment");
    redirect(session.url);
  } catch (error) {
    await createAdminClient().rpc("release_gift_certificate_redemption", {
      p_order_id: order.id,
      p_registration_id: null,
    });
    redirect(
      `/cart?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to start Stripe Checkout. Please try again.")}`,
    );
  }
}

export async function beginTicketCheckout(formData: FormData) {
  const sessionId = String(formData.get("eventSessionId") ?? "");
  const ticketTypeId = String(formData.get("ticketTypeId") ?? "");
  const quantity = Number(formData.get("quantity") ?? "0");
  if (
    !sessionId ||
    !ticketTypeId ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10
  )
    redirect("/events?error=Please+choose+a+valid+ticket+quantity.");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/events");
  const { data: ticketType } = await supabase
    .from("ticket_types")
    .select(
      "id,name,description,price_cents,capacity,event_session_id,catalog_sessions!inner(catalog_items!inner(status,item_type))",
    )
    .eq("id", ticketTypeId)
    .eq("event_session_id", sessionId)
    .eq("is_active", true)
    .maybeSingle();
  if (
    !ticketType ||
    (ticketType.capacity !== null && ticketType.capacity < quantity)
  )
    redirect("/events?error=That+ticket+type+is+no+longer+available.");
  const { data: order, error: orderError } = await supabase
    .from("ticket_orders")
    .insert({
      account_id: user.sub,
      event_session_id: sessionId,
      total_cents: ticketType.price_cents * quantity,
    })
    .select("id")
    .single();
  if (orderError || !order)
    redirect(
      `/events?error=${encodeURIComponent(orderError?.message ?? "Unable to start ticket order.")}`,
    );
  const { error: ticketsError } = await supabase.from("tickets").insert(
    Array.from({ length: quantity }, () => ({
      ticket_order_id: order.id,
      ticket_type_id: ticketType.id,
    })),
  );
  if (ticketsError)
    redirect(`/events?error=${encodeURIComponent(ticketsError.message)}`);
  const origin = (await headers()).get("origin");
  if (!origin) redirect("/events?error=Unable+to+start+checkout.");
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: {
        ticket_order_id: order.id,
        account_id: user.sub,
        order_type: "ticket",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: ticketType.name,
              description: ticketType.description ?? undefined,
            },
            unit_amount: ticketType.price_cents,
          },
          quantity,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events?message=Ticket+checkout+was+cancelled.`,
    });
    if (!session.url)
      redirect("/events?error=Stripe+did+not+return+a+checkout+URL.");
    redirect(session.url);
  } catch {
    redirect(
      "/events?error=Unable+to+start+Stripe+Checkout.+Please+try+again.",
    );
  }
}
