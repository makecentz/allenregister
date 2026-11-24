import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OrderRow = {
  id: string;
  account_id: string;
  status: string;
  subtotal_cents: number;
  created_at: string;
  order_items:
    { title?: string; item_type?: string; quantity?: number }[] | null;
};

function csvValue(value: string | number | null | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user)
    return new NextResponse("Authentication required", { status: 401 });
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) return new NextResponse("Staff access required", { status: 403 });
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,account_id,status,subtotal_cents,created_at,order_items(title,item_type,quantity)",
    )
    .order("created_at", { ascending: false });
  if (error)
    return new NextResponse("Unable to generate report", { status: 500 });
  const orders = (data ?? []) as unknown as OrderRow[];
  const accountIds = [...new Set(orders.map((order) => order.account_id))];
  const { data: profiles } = accountIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", accountIds)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
  );
  const csv = [
    "Order ID,Customer,Items,Item types,Status,Amount,Created at",
    ...orders.map((order) =>
      [
        order.id,
        names.get(order.account_id) ?? "",
        order.order_items
          ?.map((item) => `${item.quantity ?? 1} x ${item.title ?? "Item"}`)
          .join("; ") ?? "",
        [
          ...new Set(order.order_items?.map((item) => item.item_type) ?? []),
        ].join("; "),
        order.status,
        (order.subtotal_cents / 100).toFixed(2),
        order.created_at,
      ]
        .map(csvValue)
        .join(","),
    ),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=allens-lane-orders.csv",
      "Cache-Control": "no-store",
    },
  });
}
