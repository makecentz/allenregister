import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { SiteFrame } from "@/components/site-frame";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type TicketRelation = {
  name?: string;
  catalog_sessions?: {
    starts_at?: string;
    location?: string | null;
    catalog_items?: { title?: string } | null;
  } | null;
} | null;

export default async function TicketPassPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/login?next=/account/tickets/${ticketId}`);
  const { data: ticket } = await supabase.from("tickets").select("id,ticket_code,status,ticket_types(name,catalog_sessions(starts_at,location,catalog_items(title))),ticket_orders!inner(account_id)").eq("id", ticketId).eq("ticket_orders.account_id", claims.claims.sub).maybeSingle();
  if (!ticket) notFound();
  const type = ticket.ticket_types as unknown as TicketRelation;
  const qrCode = await QRCode.toDataURL(ticket.ticket_code, { errorCorrectionLevel: "M", margin: 1, width: 480 });
  const eventName = type?.catalog_sessions?.catalog_items?.title ?? "Allens Lane event";
  const date = type?.catalog_sessions?.starts_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short" }).format(new Date(type.catalog_sessions.starts_at)) : "Date to be announced";

  return <SiteFrame><main className="ticket-pass-page"><Link className="browse-link" href="/account">← Back to my account</Link><article className="ticket-pass"><p className="eyebrow">Allens Lane event ticket</p><h1>{eventName}</h1><p className="ticket-pass-tier">{type?.name ?? "Admission"}</p><dl><dt>When</dt><dd>{date}</dd><dt>Where</dt><dd>{type?.catalog_sessions?.location ?? "Allens Lane Art Center"}</dd><dt>Status</dt><dd>{ticket.status.replace("_", " ")}</dd></dl><Image src={qrCode} alt={`QR code for ticket ${ticket.ticket_code}`} width={240} height={240} unoptimized /><p className="ticket-pass-code">{ticket.ticket_code}</p><p className="small-note">Present this QR code or ticket code at the door. Each ticket is valid for one admission.</p></article></main></SiteFrame>;
}
