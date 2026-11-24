import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type RosterRow = {
  id: string;
  status: string;
  created_at: string;
  catalog_items: { title?: string; item_type?: string } | null;
  participants: { first_name?: string; last_name?: string; birth_date?: string | null } | null;
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/reports");
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");

  const [{ count: catalogCount }, { count: publishedCount }, { data: registrations }, { data: tickets }] = await Promise.all([
    supabase.from("catalog_items").select("id", { count: "exact", head: true }),
    supabase.from("catalog_items").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("registrations").select("id,status,created_at,catalog_items(title,item_type),participants(first_name,last_name,birth_date)").order("created_at", { ascending: false }),
    supabase.from("tickets").select("id,status,ticket_code,created_at,ticket_types(name,catalog_sessions(catalog_items(title)))").order("created_at", { ascending: false }).limit(100),
  ]);
  const rows = (registrations ?? []) as unknown as RosterRow[];
  const drafts = rows.filter((registration) => registration.status === "draft").length;
  const confirmed = rows.filter((registration) => registration.status === "confirmed").length;
  const ticketRows = (tickets ?? []) as unknown as { id: string; status: string; ticket_code: string; created_at: string; ticket_types: { name?: string; catalog_sessions?: { catalog_items?: { title?: string } | null } | null } | null }[];
  const issuedTickets = ticketRows.filter((ticket) => ticket.status === "issued" || ticket.status === "checked_in").length;
  const checkedInTickets = ticketRows.filter((ticket) => ticket.status === "checked_in").length;

  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Reports</h1></div><div><Link className="admin-home" href="/admin">Catalog</Link><a className="button button-primary" href="/admin/reports/registrations.csv">Export roster CSV</a></div></header><section className="report-grid"><article><span>Catalog items</span><strong>{catalogCount ?? 0}</strong></article><article><span>Published offerings</span><strong>{publishedCount ?? 0}</strong></article><article><span>Registration drafts</span><strong>{drafts}</strong></article><article><span>Confirmed registrations</span><strong>{confirmed}</strong></article><article><span>Issued tickets</span><strong>{issuedTickets}</strong></article><article><span>Checked in</span><strong>{checkedInTickets}</strong></article></section><section className="report-section"><div className="report-heading"><div><p className="eyebrow">Ticketing</p><h2>Recent ticket activity</h2></div><Link href="/admin/check-in">Open check-in</Link></div>{ticketRows.length ? <div className="roster-table"><div className="roster-head"><span>Ticket code</span><span>Event</span><span>Tier</span><span>Status</span><span>Issued</span></div>{ticketRows.map((ticket) => <div className="roster-row" key={ticket.id}><strong>{ticket.ticket_code}</strong><span>{ticket.ticket_types?.catalog_sessions?.catalog_items?.title ?? "—"}</span><span>{ticket.ticket_types?.name ?? "—"}</span><span>{ticket.status.replace("_", " ")}</span><span>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(ticket.created_at))}</span></div>)}</div> : <p className="admin-empty">Ticket sales and check-ins will appear here after event checkout begins.</p>}</section><section className="report-section"><div className="report-heading"><div><p className="eyebrow">Registration roster</p><h2>Latest registrations</h2></div><a href="/admin/reports/registrations.csv">Download CSV</a></div>{rows.length ? <div className="roster-table"><div className="roster-head"><span>Participant</span><span>Offering</span><span>Program</span><span>Status</span><span>Created</span></div>{rows.map((row) => <div className="roster-row" key={row.id}><strong>{row.participants ? `${row.participants.first_name ?? ""} ${row.participants.last_name ?? ""}`.trim() : "—"}</strong><span>{row.catalog_items?.title ?? "—"}</span><span>{row.catalog_items?.item_type ?? "—"}</span><span className="registration-status">{row.status.replace("_", " ")}</span><span>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(row.created_at))}</span></div>)}</div> : <p className="admin-empty">Registrations will appear here as customers begin their class and camp intake.</p>}</section></main>;
}
