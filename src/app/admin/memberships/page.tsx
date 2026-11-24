import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type MembershipOrder = {
  id: string;
  account_id: string;
  subtotal_cents: number;
  created_at: string;
  order_items: { title: string; item_type: string }[] | null;
};

export default async function AdminMembershipsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/memberships");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) redirect("/admin");

  const [{ data: plans }, { data: paidOrders }] = await Promise.all([
    supabase
      .from("catalog_items")
      .select("id,title,status,audience,price_cents")
      .eq("item_type", "membership")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select(
        "id,account_id,subtotal_cents,created_at,order_items!inner(title,item_type)",
      )
      .eq("status", "paid")
      .eq("order_items.item_type", "membership")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const membershipOrders = (paidOrders ?? []) as unknown as MembershipOrder[];
  const accountIds = [
    ...new Set(membershipOrders.map((order) => order.account_id)),
  ];
  const { data: profiles } = accountIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", accountIds)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
  );
  const paidRevenue = membershipOrders.reduce(
    (sum, order) => sum + order.subtotal_cents,
    0,
  );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Memberships</h1>
        </div>
        <div>
          <Link className="admin-home" href="/admin">
            Dashboard
          </Link>
          <Link className="button button-primary" href="/admin/catalog/new">
            Add membership plan
          </Link>
        </div>
      </header>
      <p className="admin-page-intro">
        Manage membership plans and review paid membership purchases. Renewal
        and expiration automation can be added once the membership policy is
        finalized.
      </p>
      <section className="dashboard-metrics membership-metrics">
        <article>
          <span>Plans</span>
          <strong>{plans?.length ?? 0}</strong>
          <small>Membership offerings in catalog</small>
        </article>
        <article>
          <span>Published</span>
          <strong>
            {plans?.filter((plan) => plan.status === "published").length ?? 0}
          </strong>
          <small>Plans available on the website</small>
        </article>
        <article>
          <span>Paid purchases</span>
          <strong>{membershipOrders.length}</strong>
          <small>Recorded membership orders</small>
        </article>
        <article>
          <span>Membership revenue</span>
          <strong>
            $
            {(paidRevenue / 100).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </strong>
          <small>Paid orders to date</small>
        </article>
      </section>
      <section className="report-section">
        <div className="report-heading">
          <div>
            <p className="eyebrow">Plans</p>
            <h2>Membership offerings</h2>
          </div>
          <Link href="/admin/catalog/new">Add offering</Link>
        </div>
        <div className="admin-table membership-table">
          <div className="admin-table-head">
            <span>Plan</span>
            <span>Audience</span>
            <span>Status</span>
            <span>Annual price</span>
          </div>
          {plans?.length ? (
            plans.map((plan) => (
              <div className="admin-table-row" key={plan.id}>
                <strong>{plan.title}</strong>
                <span>{plan.audience ?? "Membership"}</span>
                <span>
                  <i className={`status-dot ${plan.status}`} />
                  {plan.status}
                </span>
                <span>${(plan.price_cents / 100).toFixed(2)}</span>
              </div>
            ))
          ) : (
            <p className="admin-empty">
              No membership plans yet. Add a plan from the catalog form.
            </p>
          )}
        </div>
      </section>
      <section className="report-section">
        <div className="report-heading">
          <div>
            <p className="eyebrow">Members</p>
            <h2>Recent paid memberships</h2>
          </div>
        </div>
        <div className="admin-table membership-table">
          <div className="admin-table-head">
            <span>Member</span>
            <span>Plan</span>
            <span>Purchased</span>
            <span>Amount</span>
          </div>
          {membershipOrders.length ? (
            membershipOrders.map((order) => (
              <div className="admin-table-row" key={order.id}>
                <strong>
                  {names.get(order.account_id) || "Allens Lane member"}
                </strong>
                <span>
                  {order.order_items?.map((item) => item.title).join(", ") ||
                    "Membership"}
                </span>
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(order.created_at))}
                </span>
                <span>${(order.subtotal_cents / 100).toFixed(2)}</span>
              </div>
            ))
          ) : (
            <p className="admin-empty">
              Paid membership purchases will appear here.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
