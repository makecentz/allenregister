import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CsvRow = {
  status: string;
  created_at: string;
  catalog_items: { title?: string; item_type?: string } | null;
  participants: {
    first_name?: string;
    last_name?: string;
    birth_date?: string | null;
  } | null;
};

function csvValue(value: string | null | undefined) {
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
    .from("registrations")
    .select(
      "status,created_at,catalog_items(title,item_type),participants(first_name,last_name,birth_date)",
    )
    .order("created_at", { ascending: false });
  if (error)
    return new NextResponse("Unable to generate report", { status: 500 });

  const rows = (data ?? []) as unknown as CsvRow[];
  const csv = [
    "Participant first name,Participant last name,Date of birth,Offering,Program type,Registration status,Created at",
    ...rows.map((row) =>
      [
        row.participants?.first_name,
        row.participants?.last_name,
        row.participants?.birth_date,
        row.catalog_items?.title,
        row.catalog_items?.item_type,
        row.status,
        row.created_at,
      ]
        .map(csvValue)
        .join(","),
    ),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        "attachment; filename=allens-lane-registration-roster.csv",
      "Cache-Control": "no-store",
    },
  });
}
