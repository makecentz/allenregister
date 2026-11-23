import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminInstructorsPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const { message, error } = await searchParams; const supabase = await createClient(); const { data: claimsData } = await supabase.auth.getClaims(); const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/instructors"); const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle(); if (!role) redirect("/admin");
  const { data: instructors } = await supabase.from("instructors").select("id,full_name,status,sort_order,source_instructor_id").order("sort_order").order("full_name");
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Instructors</h1></div><div><Link className="admin-home" href="/admin">Catalog</Link><Link className="button button-primary" href="/admin/instructors/new">Add instructor</Link></div></header>{message ? <p className="admin-message">{message}</p> : null}{error ? <p className="form-error">{error}</p> : null}<section className="admin-table"><div className="admin-table-head"><span>Instructor</span><span>Status</span><span>Order</span><span>Source</span><span>Action</span></div>{instructors?.map((instructor) => <div className="admin-table-row" key={instructor.id}><strong>{instructor.full_name}</strong><span><i className={`status-dot ${instructor.status}`} />{instructor.status}</span><span>{instructor.sort_order}</span><span>{instructor.source_instructor_id ? "Imported" : "Staff created"}</span><Link className="admin-home" href={`/admin/instructors/${instructor.id}`}>Edit</Link></div>)}</section></main>;
}
