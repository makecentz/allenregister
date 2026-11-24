import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type CustomerRegistration = { account_id: string; status: string };
type CustomerOrder = {
  account_id: string;
  status: string;
  subtotal_cents: number;
};
type CustomerTicketOrder = {
  account_id: string;
  status: string;
  total_cents: number;
};

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/customers");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) redirect("/admin");

  const [{ data: registrations }, { data: orders }, { data: ticketOrders }] =
    await Promise.all([
      supabase.from("registrations").select("account_id,status").limit(2000),
      supabase
        .from("orders")
        .select("account_id,status,subtotal_cents")
        .limit(2000),
      supabase
        .from("ticket_orders")
        .select("account_id,status,total_cents")
        .limit(2000),
    ]);
  const registrationRows = (registrations ?? []) as CustomerRegistration[];
  const orderRows = (orders ?? []) as CustomerOrder[];
  const ticketRows = (ticketOrders ?? []) as CustomerTicketOrder[];
  const accountIds = [
    ...new Set([
      ...registrationRows.map((row) => row.account_id),
      ...orderRows.map((row) => row.account_id),
      ...ticketRows.map((row) => row.account_id),
    ]),
  ];
  const { data: profiles } = accountIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,created_at")
        .in("id", accountIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const customers = (profiles ?? []).map((profile) => {
    const customerRegistrations = registrationRows.filter(
      (row) => row.account_id === profile.id,
    );
    const customerOrders = orderRows.filter(
      (row) => row.account_id === profile.id && row.status === "paid",
    );
    const customerTickets = ticketRows.filter(
      (row) => row.account_id === profile.id && row.status === "paid",
    );
    return {
      ...profile,
      registrations: customerRegistrations.length,
      confirmed: customerRegistrations.filter(
        (row) => row.status === "confirmed",
      ).length,
      purchases:
        customerOrders.reduce((sum, row) => sum + row.subtotal_cents, 0) +
        customerTickets.reduce((sum, row) => sum + row.total_cents, 0),
    };
  });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Customers</h1>
        </div>
        <div>
          <Link className="admin-home" href="/admin">
            Dashboard
          </Link>
          <Link className="button button-primary" href="/admin/reports">
            Open reports
          </Link>
        </div>
      </header>
      <p className="admin-page-intro">
        A staff-only directory of customers with activity across registrations,
        ticketing, shop, and memberships. Customer passwords and authentication
        data are never displayed.
      </p>
      <section className="report-grid">
        <article>
          <span>Customers</span>
          <strong>{customers.length}</strong>
        </article>
        <article>
          <span>With registrations</span>
          <strong>
            {customers.filter((customer) => customer.registrations > 0).length}
          </strong>
        </article>
        <article>
          <span>With paid purchases</span>
          <strong>
            {customers.filter((customer) => customer.purchases > 0).length}
          </strong>
        </article>
        <article>
          <span>Purchase total</span>
          <strong>
            $
            {(
              customers.reduce((sum, customer) => sum + customer.purchases, 0) /
              100
            ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </strong>
        </article>
      </section>
      <section className="admin-table customer-table">
        <div className="admin-table-head">
          <span>Customer</span>
          <span>Confirmed programs</span>
          <span>All registrations</span>
          <span>Paid purchases</span>
          <span>Joined</span>
        </div>
        {customers.length ? (
          customers.map((customer) => (
            <div className="admin-table-row" key={customer.id}>
              <strong>{customer.full_name || "Allens Lane customer"}</strong>
              <span>{customer.confirmed}</span>
              <span>{customer.registrations}</span>
              <span>${(customer.purchases / 100).toFixed(2)}</span>
              <span>
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                }).format(new Date(customer.created_at))}
              </span>
            </div>
          ))
        ) : (
          <p className="admin-empty">
            Customer records will appear as people register, shop, or purchase
            tickets.
          </p>
        )}
      </section>
    </main>
  );
}
