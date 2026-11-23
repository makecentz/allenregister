import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminClassForm } from "@/components/admin-class-form";
import { createClass } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function NewClassPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/classes/new");
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");
  const { data: categories } = await supabase.from("catalog_categories").select("id,name,category_type").eq("is_active", true).order("sort_order");
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Add class</h1></div><Link className="admin-home" href="/admin/classes">← Classes</Link></header>{error ? <p className="form-error">{error}</p> : null}<AdminClassForm action={createClass} categories={(categories ?? []) as never[]} /></main>;
}
