import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  refundCommerceOrder,
  updateOrderFulfillment,
} from "@/app/admin/order-actions";

export const instant = false;

type CommerceOrder = {
  id: string;
  account_id: string;
  status: string;
  fulfillment_status: string;
  fulfillment_note: string | null;
  tracking_number: string | null;
  subtotal_cents: number;
  created_at: string;
  order_items:
    { title?: string; quantity?: number; item_type?: string }[] | null;
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
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
      "id,account_id,status,fulfillment_status,fulfillment_note,tracking_number,subtotal_cents,created_at,order_items(title,quantity,item_type)",
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
        Review paid shop and membership orders, record fulfillment progress, and
        issue full refunds through Stripe when needed.
      </p>
      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
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
          <span>Payment</span>
          <span>Fulfillment</span>
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
              <span className="order-operation">
                {order.status === "paid" ? (
                  <form action={updateOrderFulfillment}>
                    <input name="orderId" type="hidden" value={order.id} />
                    <select
                      defaultValue={order.fulfillment_status}
                      name="fulfillmentStatus"
                    >
                      <option value="unfulfilled">Unfulfilled</option>
                      <option value="processing">Processing</option>
                      <option value="ready_for_pickup">Ready for pickup</option>
                      <option value="shipped">Shipped</option>
                      <option value="completed">Completed</option>
                    </select>
                    <input
                      defaultValue={order.tracking_number ?? ""}
                      name="trackingNumber"
                      placeholder="Tracking number"
                    />
                    <input
                      defaultValue={order.fulfillment_note ?? ""}
                      name="fulfillmentNote"
                      placeholder="Internal note"
                    />
                    <button className="button">Save</button>
                  </form>
                ) : (
                  <span>{order.fulfillment_status.replaceAll("_", " ")}</span>
                )}
                {order.status === "paid" ? (
                  <form action={refundCommerceOrder}>
                    <input name="orderId" type="hidden" value={order.id} />
                    <button className="button order-refund">
                      Refund order
                    </button>
                  </form>
                ) : null}
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
