import { createClient } from "@/lib/supabase/server";

export type TicketType = { id: string; name: string; description: string | null; price_cents: number; capacity: number | null };
export type EventSession = { id: string; starts_at: string; ends_at: string; capacity: number | null; location: string | null; ticket_types: TicketType[] };
export type PublicEvent = { id: string; slug: string; title: string; audience: string | null; short_description: string | null; description: string | null; location: string | null; image_path: string | null; sessions: EventSession[] };

export async function getPublicEvents() {
  const supabase = await createClient();
  const { data: events } = await supabase.from("catalog_items").select("id,slug,title,audience,short_description,description,location,image_path").eq("item_type", "event").eq("status", "published").order("starts_on", { ascending: true, nullsFirst: false });
  const eventIds = (events ?? []).map((event) => event.id);
  if (!eventIds.length) return [] as PublicEvent[];
  const { data: sessions } = await supabase.from("catalog_sessions").select("id,catalog_item_id,starts_at,ends_at,capacity,location").in("catalog_item_id", eventIds).order("starts_at");
  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: ticketTypes } = sessionIds.length ? await supabase.from("ticket_types").select("id,event_session_id,name,description,price_cents,capacity").in("event_session_id", sessionIds).eq("is_active", true).order("sort_order") : { data: [] };
  return (events ?? []).map((event) => ({ ...event, sessions: (sessions ?? []).filter((session) => session.catalog_item_id === event.id).map((session) => ({ ...session, ticket_types: (ticketTypes ?? []).filter((ticket) => ticket.event_session_id === session.id) })) })) as PublicEvent[];
}

export async function getPublicEventBySlug(slug: string) {
  return (await getPublicEvents()).find((event) => event.slug === slug) ?? null;
}
