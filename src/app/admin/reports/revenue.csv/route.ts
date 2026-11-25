import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RevenueRow = {
  id: string;
  source: string;
  status: string;
  created_at: string;
  amount_cents: number;
  description: string;
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

  const [{ data: registrations }, { data: orders }, { data: tickets }, { data: donations }] =
    await Promise.all([
      supabase
        .from("registrations")
        .select("id,status,price_cents,created_at,catalog_items(title)")
        .eq("status", "confirmed"),
      supabase
        .from("orders")
        .select("id,status,subtotal_cents,created_at")
        .eq("status", "paid"),
      supabase
        .from("ticket_orders")
        .select("id,status,total_cents,created_at,catalog_sessions(catalog_items(title))")
        .eq("status", "paid"),
      supabase
        .from("donations")
        .select("id,status,amount_cents,created_at,donation_funds(name)")
        .eq("status", "paid"),
    ]);
  const rows: RevenueRow[] = [
    ...((registrations ?? []) as unknown as { id: string; status: string; price_cents: number; created_at: string; catalog_items: { title?: string } | null }[]).map((row) => ({ id: row.id, source: "Registration", status: row.status, created_at: row.created_at, amount_cents: row.price_cents, description: row.catalog_items?.title ?? "Registration" })),
    ...((orders ?? []) as { id: string; status: string; subtotal_cents: number; created_at: string }[]).map((row) => ({ id: row.id, source: "Commerce", status: row.status, created_at: row.created_at, amount_cents: row.subtotal_cents, description: "Shop or membership order" })),
    ...((tickets ?? []) as unknown as { id: string; status: string; total_cents: number; created_at: string; catalog_sessions: { catalog_items?: { title?: string } | null } | null }[]).map((row) => ({ id: row.id, source: "Ticketing", status: row.status, created_at: row.created_at, amount_cents: row.total_cents, description: row.catalog_sessions?.catalog_items?.title ?? "Ticket order" })),
    ...((donations ?? []) as unknown as { id: string; status: string; amount_cents: number; created_at: string; donation_funds: { name?: string } | null }[]).map((row) => ({ id: row.id, source: "Donation", status: row.status, created_at: row.created_at, amount_cents: row.amount_cents, description: row.donation_funds?.name ?? "Donation" })),
  ].sort((left, right) => right.created_at.localeCompare(left.created_at));
  const csv = [
    "Source,Record ID,Description,Status,Amount,Created at",
    ...rows.map((row) => [row.source, row.id, row.description, row.status, (row.amount_cents / 100).toFixed(2), row.created_at].map(csvValue).join(",")),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=allens-lane-revenue.csv",
      "Cache-Control": "no-store",
    },
  });
}
