import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin");
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) return <main className="admin-page"><Link href="/">← Back to home</Link><section className="admin-access"><p className="eyebrow">Allens Lane staff</p><h1>Access pending</h1><p>Your account is active, but it has not yet been assigned a staff role. Ask a system administrator to activate access.</p><Link className="button button-primary" href="/account">Go to my account</Link></section></main>;

  const { data: items } = await supabase.from("catalog_items").select("id,title,item_type,status,starts_on,price_cents").order("created_at", { ascending: false });
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Catalog</h1></div><div><Link href="/admin/classes" className="admin-home">Classes</Link><Link href="/admin/reports" className="admin-home">Reports</Link><Link href="/admin/funds" className="admin-home">Donation funds</Link><Link href="/" className="admin-home">View website</Link><Link className="button button-primary" href="/admin/catalog/new">Add offering</Link></div></header><section className="admin-table"><div className="admin-table-head"><span>Offering</span><span>Type</span><span>Status</span><span>Start date</span><span>Price</span></div>{items?.length ? items.map((item) => <div className="admin-table-row" key={item.id}><strong>{item.title}</strong><span>{item.item_type}</span><span><i className={`status-dot ${item.status}`} />{item.status}</span><span>{item.starts_on ?? "—"}</span><span>{item.price_cents === 0 ? "Free" : `$${(item.price_cents / 100).toFixed(2)}`}</span></div>) : <p className="admin-empty">No catalog items yet. Add the first class, event, camp, product, or membership plan.</p>}</section></main>;
}
