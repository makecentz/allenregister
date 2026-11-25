import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMembershipActive } from "@/lib/membership-status";

export const instant = false;

type MembershipRecord = {
  id: string;
  account_id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  created_at: string;
  catalog_items: { title?: string } | null;
};

export default async function AdminMembershipsPage() {
  await connection();
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

  const [{ data: plans }, { data: membershipRows }] = await Promise.all([
    supabase
      .from("catalog_items")
      .select("id,title,status,audience,price_cents")
      .eq("item_type", "membership")
      .order("created_at", { ascending: false }),
    supabase
      .from("memberships")
      .select(
        "id,account_id,status,starts_at,expires_at,created_at,catalog_items(title)",
      )
      .order("expires_at", { ascending: false })
      .limit(100),
  ]);
  const membershipOrders = (membershipRows ?? []) as unknown as MembershipRecord[];
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
  const activeMemberships = membershipOrders.filter(
    (membership) => isMembershipActive(membership.status, membership.expires_at),
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
        Manage annual membership plans and review active and expired member
        records.
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
          <span>Active members</span>
          <strong>{activeMemberships.length}</strong>
          <small>Memberships within their annual term</small>
        </article>
        <article>
          <span>Membership records</span>
          <strong>{membershipOrders.length}</strong>
          <small>Current and historical membership terms</small>
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
            <h2>Membership terms</h2>
          </div>
        </div>
        <div className="admin-table membership-table">
          <div className="admin-table-head">
            <span>Member</span>
            <span>Plan</span>
            <span>Term</span>
            <span>Status</span>
          </div>
          {membershipOrders.length ? (
            membershipOrders.map((membership) => (
              <div className="admin-table-row" key={membership.id}>
                <strong>
                  {names.get(membership.account_id) || "Allens Lane member"}
                </strong>
                <span>
                  {membership.catalog_items?.title ?? "Membership"}
                </span>
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(membership.starts_at))} {" – "}
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(membership.expires_at))}
                </span>
                <span>
                  {isMembershipActive(membership.status, membership.expires_at)
                    ? "Active"
                    : "Expired"}
                </span>
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
