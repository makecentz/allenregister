import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminInstructorForm } from "@/components/admin-instructor-form";
import { createInstructor } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function NewInstructorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const { error } = await searchParams; const supabase = await createClient(); const { data: claimsData } = await supabase.auth.getClaims(); const user = claimsData?.claims; if (!user) redirect("/login?next=/admin/instructors/new"); const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle(); if (!role) redirect("/admin"); return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Add instructor</h1></div><Link className="admin-home" href="/admin/instructors">← Instructors</Link></header>{error ? <p className="form-error">{error}</p> : null}<AdminInstructorForm action={createInstructor} /></main>; }
