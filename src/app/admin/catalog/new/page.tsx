import Link from "next/link";
import { redirect } from "next/navigation";
import { createCatalogItem } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function NewCatalogItemPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/catalog/new");
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Add an offering</h1></div><Link className="admin-home" href="/admin">← Catalog</Link></header><form className="admin-form" action={createCatalogItem}><div className="admin-form-grid"><label>Offering type<select name="itemType" defaultValue="class"><option value="class">Class</option><option value="camp">Summer camp</option><option value="event">Event</option><option value="product">Shop product</option><option value="membership">Membership</option></select></label><label>Publication status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option></select></label></div><label>Title<input name="title" required placeholder="e.g. Tuesday Morning Pottery" /></label><label>Short description<textarea name="summary" rows={4} placeholder="A concise customer-facing description" /></label><div className="admin-form-grid"><label>Audience<input name="audience" placeholder="Adults, Youth, All ages…" /></label><label>Location<input name="location" placeholder="Ceramics Studio" /></label><label>Start date<input name="startsOn" type="date" /></label><label>End date<input name="endsOn" type="date" /></label><label>Price (USD)<input name="price" inputMode="decimal" defaultValue="0" /></label><label>Capacity / inventory<input name="capacity" type="number" min="0" /></label></div><button className="button button-primary">Save offering</button></form></main>;
}
