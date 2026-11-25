import Link from "next/link";
import { redirect } from "next/navigation";
import { assignStaffRole, revokeStaffRole } from "@/app/admin/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type StaffRole = {
  user_id: string;
  role: "admin" | "staff";
  created_at: string;
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims;
  if (!user) redirect("/login?next=/admin/staff");
  const { data: currentRole } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (currentRole?.role !== "admin") redirect("/admin");

  const admin = createAdminClient();
  const { data: roles } = await admin
    .from("staff_roles")
    .select("user_id,role,created_at")
    .order("created_at", { ascending: true });
  const staffRoles = (roles ?? []) as StaffRole[];
  const profiles = staffRoles.length
    ? await admin
        .from("profiles")
        .select("id,full_name")
        .in(
          "id",
          staffRoles.map((role) => role.user_id),
        )
    : { data: [] };
  const names = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile.full_name]),
  );
  const users = await Promise.all(
    staffRoles.map(async (staffRole) => {
      const { data } = await admin.auth.admin.getUserById(staffRole.user_id);
      return { ...staffRole, email: data.user?.email ?? "Account unavailable" };
    }),
  );

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Staff access</h1>
        </div>
        <Link className="admin-home" href="/admin">
          Admin dashboard
        </Link>
      </header>
      <p className="admin-page-intro">
        Only administrators can assign portal access. The person must create an
        account before a role can be assigned.
      </p>
      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="admin-form" action={assignStaffRole}>
        <div className="admin-form-grid">
          <label>
            Existing account email
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Portal role
            <select defaultValue="staff" name="role">
              <option value="staff">Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
        </div>
        <button className="button button-primary">Save staff access</button>
      </form>
      <section className="report-section">
        <div className="report-heading">
          <div>
            <p className="eyebrow">Current access</p>
            <h2>Staff accounts</h2>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Assigned</span>
            <span>Action</span>
          </div>
          {users.length ? (
            users.map((staffRole) => (
              <div className="admin-table-row" key={staffRole.user_id}>
                <strong>{names.get(staffRole.user_id) || "Allens Lane staff"}</strong>
                <span>{staffRole.email}</span>
                <span>{staffRole.role}</span>
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(staffRole.created_at))}
                </span>
                <span>
                  {staffRole.user_id === user.sub ? (
                    "Your account"
                  ) : (
                    <form action={revokeStaffRole}>
                      <input
                        name="userId"
                        type="hidden"
                        value={staffRole.user_id}
                      />
                      <button className="admin-home">Remove access</button>
                    </form>
                  )}
                </span>
              </div>
            ))
          ) : (
            <p className="admin-empty">No staff roles have been assigned.</p>
          )}
        </div>
      </section>
    </main>
  );
}
