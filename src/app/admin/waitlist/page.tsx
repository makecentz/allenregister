import Link from "next/link";
import { redirect } from "next/navigation";
import { updateWaitlistEntry } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=/admin/waitlist");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", claims.claims.sub)
    .maybeSingle();
  if (!role) redirect("/admin");
  const { data: entries } = await supabase
    .from("waitlist_entries")
    .select(
      "id,status,staff_note,created_at,catalog_items(title,item_type,capacity),participants(first_name,last_name,birth_date)",
    )
    .in("status", ["waiting", "offered"])
    .order("created_at", { ascending: true });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Registration operations</p>
          <h1>Waitlists</h1>
        </div>
        <Link className="admin-home" href="/admin/classes">
          Class management
        </Link>
      </header>
      <p className="admin-page-intro">
        Entries are ordered by the time they joined. Mark a space as offered
        only after confirming there is capacity.
      </p>
      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <section className="admin-table waitlist-table">
        <div className="admin-table-head">
          <span>Offering</span>
          <span>Participant</span>
          <span>Joined</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {entries?.length ? (
          entries.map((entry) => {
            const item = entry.catalog_items as {
              title?: string;
              item_type?: string;
              capacity?: number | null;
            } | null;
            const participant = entry.participants as {
              first_name?: string;
              last_name?: string;
              birth_date?: string | null;
            } | null;
            return (
              <form
                action={updateWaitlistEntry}
                className="admin-table-row"
                key={entry.id}
              >
                <input name="entryId" type="hidden" value={entry.id} />
                <span>
                  <strong>{item?.title ?? "Allens Lane offering"}</strong>
                  <small>
                    {item?.item_type} · capacity {item?.capacity ?? "—"}
                  </small>
                </span>
                <span>
                  {participant?.first_name} {participant?.last_name}
                  {participant?.birth_date
                    ? ` · ${participant.birth_date}`
                    : ""}
                </span>
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(entry.created_at))}
                </span>
                <select defaultValue={entry.status} name="status">
                  <option value="waiting">Waiting</option>
                  <option value="offered">Space offered</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <span className="waitlist-action">
                  <input
                    defaultValue={entry.staff_note ?? ""}
                    name="staffNote"
                    placeholder="Internal note"
                  />
                  <button className="button">Save</button>
                </span>
              </form>
            );
          })
        ) : (
          <p className="admin-empty">There are no active waitlist entries.</p>
        )}
      </section>
    </main>
  );
}
