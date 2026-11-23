import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminInstructorForm } from "@/components/admin-instructor-form";
import { updateInstructor } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function EditInstructorPage({ params, searchParams }: { params: Promise<{ instructorId: string }>; searchParams: Promise<{ error?: string }> }) { const { instructorId } = await params; const { error } = await searchParams; const supabase = await createClient(); const { data: claimsData } = await supabase.auth.getClaims(); const user = claimsData?.claims; if (!user) redirect(`/login?next=/admin/instructors/${instructorId}`); const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle(); if (!role) redirect("/admin"); const { data: instructor } = await supabase.from("instructors").select("id,full_name,status,short_bio,biography,image_url,website_url,specialties,sort_order").eq("id", instructorId).maybeSingle(); if (!instructor) notFound(); return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Edit instructor</h1></div><Link className="admin-home" href="/admin/instructors">← Instructors</Link></header>{error ? <p className="form-error">{error}</p> : null}<AdminInstructorForm action={updateInstructor} instructor={instructor} /></main>; }
