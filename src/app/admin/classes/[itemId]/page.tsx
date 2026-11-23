import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminClassForm } from "@/components/admin-class-form";
import { updateClass } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function EditClassPage({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { itemId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect(`/login?next=/admin/classes/${itemId}`);
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");
  const [{ data: item }, { data: categories }, { data: links }] = await Promise.all([
    supabase.from("catalog_items").select("id,title,status,short_description,description,audience,starts_on,ends_on,location,capacity,price_cents,metadata").eq("id", itemId).eq("item_type", "class").maybeSingle(),
    supabase.from("catalog_categories").select("id,name,category_type").eq("is_active", true).order("sort_order"),
    supabase.from("catalog_item_categories").select("category_id").eq("catalog_item_id", itemId),
  ]);
  if (!item) notFound();
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Edit class</h1></div><Link className="admin-home" href="/admin/classes">← Classes</Link></header>{error ? <p className="form-error">{error}</p> : null}<AdminClassForm action={updateClass} item={item} categories={(categories ?? []) as never[]} selectedCategoryIds={(links ?? []).map((link) => link.category_id)} /></main>;
}
