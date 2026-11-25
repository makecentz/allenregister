import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type CommerceOrder = {
  id: string;
  account_id: string;
  status: string;
  subtotal_cents: number;
  created_at: string;
  order_items:
    { title?: string; quantity?: number; item_type?: string }[] | null;
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims;
  if (!user) redirect("/login?next=/admin/orders");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) redirect("/admin");
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id,account_id,status,subtotal_cents,created_at,order_items(title,quantity,item_type)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const orderRows = (orders ?? []) as unknown as CommerceOrder[];
  const accountIds = [...new Set(orderRows.map((order) => order.account_id))];
  const { data: profiles } = accountIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", accountIds)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
  );
  const paid = orderRows.filter((order) => order.status === "paid");
  const productOrders = paid.filter((order) =>
    order.order_items?.some((item) => item.item_type === "product"),
  ).length;
  const membershipOrders = paid.filter((order) =>
    order.order_items?.some((item) => item.item_type === "membership"),
  ).length;
  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Commerce orders</h1>
        </div>
        <div>
          <Link className="admin-home" href="/admin/products">
            Shop inventory
          </Link>
          <Link
            className="button button-primary"
            href="/admin/reports/orders.csv"
          >
            Export CSV
          </Link>
        </div>
      </header>
      <p className="admin-page-intro">
        Review paid shop and membership orders for fulfillment and customer
        service. Refunds are kept in Stripe until Allens Lane’s refund policy is
        approved.
      </p>
      <section className="report-grid">
        <article>
          <span>Paid orders</span>
          <strong>{paid.length}</strong>
        </article>
        <article>
          <span>Shop orders</span>
          <strong>{productOrders}</strong>
        </article>
        <article>
          <span>Membership orders</span>
          <strong>{membershipOrders}</strong>
        </article>
        <article>
          <span>Paid revenue</span>
          <strong>
            $
            {(
              paid.reduce((sum, order) => sum + order.subtotal_cents, 0) / 100
            ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </strong>
        </article>
      </section>
      <section className="admin-table commerce-order-table">
        <div className="admin-table-head">
          <span>Customer</span>
          <span>Items</span>
          <span>Purchased</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
        {orderRows.length ? (
          orderRows.map((order) => (
            <div className="admin-table-row" key={order.id}>
              <strong>
                {names.get(order.account_id) || "Allens Lane customer"}
              </strong>
              <span>
                {order.order_items
                  ?.map(
                    (item) => `${item.quantity ?? 1} × ${item.title ?? "Item"}`,
                  )
                  .join(", ") || "—"}
              </span>
              <span>
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                }).format(new Date(order.created_at))}
              </span>
              <span>${(order.subtotal_cents / 100).toFixed(2)}</span>
              <span>
                <i
                  className={`status-dot ${order.status === "paid" ? "published" : "draft"}`}
                />
                {order.status.replace("_", " ")}
              </span>
            </div>
          ))
        ) : (
          <p className="admin-empty">
            Shop and membership orders will appear after payment.
          </p>
        )}
      </section>
    </main>
  );
}
