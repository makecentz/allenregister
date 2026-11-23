import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminClassesPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const { message, error } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/classes");
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");
  const { data: classes } = await supabase.from("catalog_items").select("id,title,status,starts_on,price_cents,metadata").eq("item_type", "class").order("starts_on", { ascending: true, nullsFirst: false });
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Classes</h1></div><div><Link className="admin-home" href="/admin">Catalog</Link><Link className="button button-primary" href="/admin/classes/new">Add class</Link></div></header>{message ? <p className="admin-message">{message}</p> : null}{error ? <p className="form-error">{error}</p> : null}<section className="admin-table"><div className="admin-table-head"><span>Class</span><span>Status</span><span>Start date</span><span>Tuition</span><span>Action</span></div>{classes?.map((item) => <div className="admin-table-row" key={item.id}><strong>{item.title}</strong><span><i className={`status-dot ${item.status}`} />{item.status}</span><span>{item.starts_on ?? "—"}</span><span>{item.price_cents === 0 ? "Free" : `$${(item.price_cents / 100).toFixed(2)}`}</span><Link className="admin-home" href={`/admin/classes/${item.id}`}>Edit</Link></div>)}</section></main>;
}
