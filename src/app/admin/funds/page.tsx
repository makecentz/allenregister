import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DonationFundsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/funds");
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");
  const { data: funds } = await supabase.from("donation_funds").select("id,name,description,is_active").order("sort_order", { ascending: true });
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Donation funds</h1></div><div><Link className="admin-home" href="/admin">Catalog</Link><Link className="button button-primary" href="/admin/funds/new">Add fund</Link></div></header><section className="admin-table"><div className="admin-table-head fund-head"><span>Fund</span><span>Description</span><span>Status</span></div>{funds?.length ? funds.map((fund) => <div className="admin-table-row fund-row" key={fund.id}><strong>{fund.name}</strong><span>{fund.description ?? "—"}</span><span><i className={`status-dot ${fund.is_active ? "published" : "draft"}`} />{fund.is_active ? "active" : "inactive"}</span></div>) : <p className="admin-empty">No donation funds yet. Add the first fund to connect it to the public donation page.</p>}</section></main>;
}
