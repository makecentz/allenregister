import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type RegistrationMetric = {
  account_id: string;
  status: string;
  catalog_items: { item_type?: string } | null;
};
type TicketOrderMetric = {
  account_id: string;
  status: string;
  total_cents: number;
  created_at: string;
};

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    new Date(value),
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role)
    return (
      <main className="admin-page">
        <Link href="/">← Back to home</Link>
        <section className="admin-access">
          <p className="eyebrow">Allens Lane staff</p>
          <h1>Access pending</h1>
          <p>
            Your account is active, but it has not yet been assigned a staff
            role. Ask a system administrator to activate access.
          </p>
          <Link className="button button-primary" href="/account">
            Go to my account
          </Link>
        </section>
      </main>
    );

  const [
    { count: offeringCount },
    { count: publishedCount },
    { count: classCount },
    { count: eventCount },
    { data: registrations },
    { data: ticketOrders },
    { count: issuedTicketCount },
    { data: recentItems },
  ] = await Promise.all([
    supabase.from("catalog_items").select("id", { count: "exact", head: true }),
    supabase
      .from("catalog_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("catalog_items")
      .select("id", { count: "exact", head: true })
      .eq("item_type", "class")
      .eq("status", "published"),
    supabase
      .from("catalog_items")
      .select("id", { count: "exact", head: true })
      .eq("item_type", "event")
      .eq("status", "published"),
    supabase
      .from("registrations")
      .select("account_id,status,catalog_items(item_type)"),
    supabase
      .from("ticket_orders")
      .select("account_id,status,total_cents,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["issued", "checked_in"]),
    supabase
      .from("catalog_items")
      .select("id,title,item_type,status,starts_on,price_cents")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const registrationRows = (registrations ??
    []) as unknown as RegistrationMetric[];
  const orderRows = (ticketOrders ?? []) as TicketOrderMetric[];
  const customerIds = new Set([
    ...registrationRows.map((registration) => registration.account_id),
    ...orderRows.map((order) => order.account_id),
  ]);
  const confirmedRegistrations = registrationRows.filter(
    (registration) => registration.status === "confirmed",
  ).length;
  const pendingRegistrations = registrationRows.filter(
    (registration) =>
      registration.status === "draft" ||
      registration.status === "pending_payment",
  ).length;
  const ticketRevenue = orderRows
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.total_cents, 0);
  const today = new Date();
  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    const total = orderRows
      .filter(
        (order) =>
          order.status === "paid" && order.created_at.slice(0, 10) === key,
      )
      .reduce((sum, order) => sum + order.total_cents, 0);
    return { label: dayLabel(day.toISOString()), total };
  });
  const maxSales = Math.max(...dailySales.map((day) => day.total), 1);
  const classRegistrations = registrationRows.filter(
    (registration) => registration.catalog_items?.item_type === "class",
  ).length;
  const campRegistrations = registrationRows.filter(
    (registration) => registration.catalog_items?.item_type === "camp",
  ).length;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Admin dashboard</h1>
        </div>
        <div>
          <Link className="admin-home" href="/">
            View website
          </Link>
          <Link className="button button-primary" href="/admin/catalog/new">
            Add offering
          </Link>
        </div>
      </header>
      <p className="admin-page-intro">
        A live operational overview of programs, customers, ticketing, and
        revenue.
      </p>
      <section className="dashboard-metrics">
        <article>
          <span>Published offerings</span>
          <strong>{publishedCount ?? 0}</strong>
          <small>{offeringCount ?? 0} total in catalog</small>
        </article>
        <article>
          <span>Active classes</span>
          <strong>{classCount ?? 0}</strong>
          <small>{classRegistrations} class registrations</small>
        </article>
        <article>
          <span>Customers</span>
          <strong>{customerIds.size}</strong>
          <small>Accounts with registrations or tickets</small>
        </article>
        <article>
          <span>Ticket revenue</span>
          <strong>
            $
            {(ticketRevenue / 100).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </strong>
          <small>{issuedTicketCount ?? 0} issued tickets</small>
        </article>
      </section>
      <section className="dashboard-grid">
        <article className="dashboard-panel dashboard-chart">
          <div>
            <p className="eyebrow">Ticketing</p>
            <h2>Sales, last 7 days</h2>
          </div>
          <div
            className="bar-chart"
            aria-label="Ticket sales for the past seven days"
          >
            {dailySales.map((day) => (
              <div key={day.label}>
                <span
                  style={{
                    height: `${Math.max((day.total / maxSales) * 100, day.total ? 8 : 2)}%`,
                  }}
                  title={`$${(day.total / 100).toFixed(2)}`}
                />
                <small>{day.label}</small>
              </div>
            ))}
          </div>
          <p className="dashboard-caption">
            Paid ticket revenue only. Refunds and exchanges will be enabled
            after policy approval.
          </p>
        </article>
        <article className="dashboard-panel">
          <p className="eyebrow">Registration health</p>
          <h2>Program mix</h2>
          <dl className="dashboard-breakdown">
            <div>
              <dt>Confirmed</dt>
              <dd>{confirmedRegistrations}</dd>
            </div>
            <div>
              <dt>Draft / awaiting payment</dt>
              <dd>{pendingRegistrations}</dd>
            </div>
            <div>
              <dt>Class registrations</dt>
              <dd>{classRegistrations}</dd>
            </div>
            <div>
              <dt>Camp registrations</dt>
              <dd>{campRegistrations}</dd>
            </div>
            <div>
              <dt>Published events</dt>
              <dd>{eventCount ?? 0}</dd>
            </div>
          </dl>
        </article>
      </section>
      <section className="dashboard-links">
        <Link href="/admin/classes">
          <strong>Classes</strong>
          <span>Manage course catalog and schedules</span>
        </Link>
        <Link href="/admin/camp">
          <strong>Summer camp</strong>
          <span>Manage camp sessions and capacity</span>
        </Link>
        <Link href="/admin/events">
          <strong>Events</strong>
          <span>Create productions and ticket tiers</span>
        </Link>
        <Link href="/admin/ticket-orders">
          <strong>Ticket orders</strong>
          <span>Review sales and attendance</span>
        </Link>
        <Link href="/admin/check-in">
          <strong>Check-in</strong>
          <span>Scan or enter ticket codes</span>
        </Link>
        <Link href="/admin/attendance">
          <strong>Attendance</strong>
          <span>Track class and camp participation</span>
        </Link>
        <Link href="/admin/reports">
          <strong>Reports</strong>
          <span>Export rosters and review activity</span>
        </Link>
        <Link href="/admin/products">
          <strong>Shop</strong>
          <span>Manage inventory and merchandise</span>
        </Link>
        <Link href="/admin/memberships">
          <strong>Memberships</strong>
          <span>Manage plans and paid members</span>
        </Link>
        <Link href="/admin/customers">
          <strong>Customers</strong>
          <span>Review household activity and purchases</span>
        </Link>
        <Link href="/admin/instructors">
          <strong>Instructors</strong>
          <span>Manage public teaching profiles</span>
        </Link>
        <Link href="/admin/funds">
          <strong>Giving</strong>
          <span>Manage donation funds</span>
        </Link>
      </section>
      <section className="report-section">
        <div className="report-heading">
          <div>
            <p className="eyebrow">Content management</p>
            <h2>Recently updated offerings</h2>
          </div>
          <Link href="/admin/reports">Open reports</Link>
        </div>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Offering</span>
            <span>Type</span>
            <span>Status</span>
            <span>Start date</span>
            <span>Price</span>
          </div>
          {recentItems?.length ? (
            recentItems.map((item) => (
              <div className="admin-table-row" key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.item_type}</span>
                <span>
                  <i className={`status-dot ${item.status}`} />
                  {item.status}
                </span>
                <span>{item.starts_on ?? "—"}</span>
                <span>
                  {item.price_cents === 0
                    ? "Free"
                    : `$${(item.price_cents / 100).toFixed(2)}`}
                </span>
              </div>
            ))
          ) : (
            <p className="admin-empty">
              No catalog items yet. Add the first class, event, camp, product,
              or membership plan.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
