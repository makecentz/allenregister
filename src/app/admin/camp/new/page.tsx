import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCampForm } from "@/components/admin-camp-form";
import { createCamp } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
export const instant = false;
export default async function NewCampPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const { error } = await searchParams; const supabase = await createClient(); const { data: claimsData } = await supabase.auth.getClaims(); const user = claimsData?.claims; if (!user) redirect("/login?next=/admin/camp/new"); const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle(); if (!role) redirect("/admin"); return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Add camp session</h1></div><Link className="admin-home" href="/admin/camp">← Summer camp</Link></header>{error ? <p className="form-error">{error}</p> : null}<AdminCampForm action={createCamp} /></main>; }
