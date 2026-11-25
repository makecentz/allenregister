import Link from "next/link";
import { redirect } from "next/navigation";
import { sendProgramEmail } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type EmailLog = {
  id: string;
  subject: string;
  recipient_count: number;
  created_at: string;
  catalog_items: { title?: string } | null;
};

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims;
  if (!user) redirect("/login?next=/admin/communications");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) redirect("/admin");

  const [{ data: offerings }, { data: logs }] = await Promise.all([
    supabase
      .from("catalog_items")
      .select("id,title,item_type,starts_on")
      .in("item_type", ["class", "camp"])
      .eq("status", "published")
      .order("starts_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("program_email_log")
      .select("id,subject,recipient_count,created_at,catalog_items(title)")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const emailLogs = (logs ?? []) as unknown as EmailLog[];

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Email students</h1>
        </div>
        <Link className="admin-home" href="/admin">
          Admin dashboard
        </Link>
      </header>
      <p className="admin-page-intro">
        Send a single message to the confirmed households for a class or camp.
        Each household receives an individual email address line.
      </p>
      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="admin-form" action={sendProgramEmail}>
        <label>
          Class or camp session
          <select defaultValue="" name="catalogItemId" required>
            <option disabled value="">
              Choose an offering
            </option>
            {(offerings ?? []).map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.item_type === "camp" ? "Camp" : "Class"} ·{" "}
                {offering.title}
                {offering.starts_on ? ` · ${offering.starts_on}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Email subject
          <input maxLength={160} name="subject" required />
        </label>
        <label>
          Message
          <textarea maxLength={5000} name="message" required rows={10} />
        </label>
        <p className="small-note">
          This sends only to confirmed registrations. The send is recorded in
          the log below after Resend accepts the emails for delivery.
        </p>
        <button className="button button-primary">Send email</button>
      </form>
      <section className="report-section">
        <div className="report-heading">
          <div>
            <p className="eyebrow">Delivery activity</p>
            <h2>Recent program emails</h2>
          </div>
        </div>
        {emailLogs.length ? (
          <div className="roster-table">
            <div className="roster-head">
              <span>Offering</span>
              <span>Subject</span>
              <span>Households</span>
              <span>Sent</span>
            </div>
            {emailLogs.map((log) => (
              <div className="roster-row" key={log.id}>
                <strong>{log.catalog_items?.title ?? "Offering"}</strong>
                <span>{log.subject}</span>
                <span>{log.recipient_count}</span>
                <span>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(log.created_at))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-empty">
            Sent program emails will appear here.
          </p>
        )}
      </section>
    </main>
  );
}
