import Link from "next/link";
import { redirect } from "next/navigation";
import { refundTicketOrder } from "@/app/admin/order-actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type TicketRow = { ticket_order_id: string; status: string };
type OrderRow = {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  catalog_sessions: {
    starts_at?: string;
    catalog_items?: { title?: string } | null;
  } | null;
};

export default async function TicketOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims;
  if (!user) redirect("/login?next=/admin/ticket-orders");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) redirect("/admin");

  const { data: orders } = await supabase
    .from("ticket_orders")
    .select(
      "id,status,total_cents,created_at,catalog_sessions(starts_at,catalog_items(title))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const orderRows = (orders ?? []) as unknown as OrderRow[];
  const orderIds = orderRows.map((order) => order.id);
  const { data: tickets } = orderIds.length
    ? await supabase
        .from("tickets")
        .select("ticket_order_id,status")
        .in("ticket_order_id", orderIds)
    : { data: [] };
  const ticketsByOrder = new Map<string, TicketRow[]>();
  for (const ticket of (tickets ?? []) as TicketRow[])
    ticketsByOrder.set(ticket.ticket_order_id, [
      ...(ticketsByOrder.get(ticket.ticket_order_id) ?? []),
      ticket,
    ]);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Ticket orders</h1>
        </div>
        <div>
          <Link className="admin-home" href="/admin/events">
            Events
          </Link>
          <Link className="button button-primary" href="/admin/check-in">
            Open check-in
          </Link>
        </div>
      </header>
      <p className="admin-page-intro">
        Review ticket sales, attendance, and full-order refunds. Tickets that
        have been checked in cannot be refunded from the portal.
      </p>
      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <section className="admin-table ticket-order-table">
        <div className="admin-table-head">
          <span>Event</span>
          <span>Purchased</span>
          <span>Tickets</span>
          <span>Check-in</span>
          <span>Total</span>
          <span>Status</span>
        </div>
        {orderRows.length ? (
          orderRows.map((order) => {
            const orderTickets = ticketsByOrder.get(order.id) ?? [];
            const checkedIn = orderTickets.filter(
              (ticket) => ticket.status === "checked_in",
            ).length;
            return (
              <div className="admin-table-row" key={order.id}>
                <strong>
                  {order.catalog_sessions?.catalog_items?.title ??
                    "Allens Lane event"}
                </strong>
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(order.created_at))}
                </span>
                <span>{orderTickets.length}</span>
                <span>
                  {checkedIn} / {orderTickets.length}
                </span>
                <span>${(order.total_cents / 100).toFixed(2)}</span>
                <span className="order-operation">
                  <span>
                    <i
                      className={`status-dot ${order.status === "paid" ? "published" : "draft"}`}
                    />
                    {order.status.replace("_", " ")}
                  </span>
                  {order.status === "paid" && checkedIn === 0 ? (
                    <form action={refundTicketOrder}>
                      <input name="orderId" type="hidden" value={order.id} />
                      <button className="button order-refund">
                        Refund order
                      </button>
                    </form>
                  ) : null}
                </span>
              </div>
            );
          })
        ) : (
          <p className="admin-empty">
            Ticket orders will appear here when customers complete checkout.
          </p>
        )}
      </section>
    </main>
  );
}
