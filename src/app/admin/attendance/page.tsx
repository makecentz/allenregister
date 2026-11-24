import Link from "next/link";
import { redirect } from "next/navigation";
import { toggleRegistrationAttendance } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type RosterRegistration = {
  id: string;
  participants: { first_name?: string; last_name?: string } | null;
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    offeringId?: string;
    date?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const { offeringId, date, message, error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const attendedOn = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : today;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/attendance");
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) redirect("/admin");
  const { data: offerings } = await supabase
    .from("catalog_items")
    .select("id,title,item_type,starts_on")
    .in("item_type", ["class", "camp"])
    .eq("status", "published")
    .order("starts_on", { ascending: true, nullsFirst: false });
  const selectedId =
    offeringId && offerings?.some((offering) => offering.id === offeringId)
      ? offeringId
      : offerings?.[0]?.id;
  const { data: registrations } = selectedId
    ? await supabase
        .from("registrations")
        .select("id,participants(first_name,last_name)")
        .eq("catalog_item_id", selectedId)
        .eq("status", "confirmed")
        .order("created_at")
    : { data: [] };
  const roster = (registrations ?? []) as unknown as RosterRegistration[];
  const registrationIds = roster.map((registration) => registration.id);
  const { data: attendance } = registrationIds.length
    ? await supabase
        .from("registration_attendance")
        .select("registration_id")
        .eq("attended_on", attendedOn)
        .in("registration_id", registrationIds)
    : { data: [] };
  const attended = new Set(
    (attendance ?? []).map((record) => record.registration_id),
  );
  const selectedOffering = offerings?.find(
    (offering) => offering.id === selectedId,
  );
  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Allens Lane staff portal</p>
          <h1>Attendance roster</h1>
        </div>
        <div>
          <Link className="admin-home" href="/admin">
            Dashboard
          </Link>
          <Link className="button button-primary" href="/admin/reports">
            Reports
          </Link>
        </div>
      </header>
      <p className="admin-page-intro">
        Mark attendance for confirmed class and camp registrations. Each date is
        tracked independently for a reliable teaching and reporting record.
      </p>
      {message ? <p className="admin-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <form className="attendance-filters" action="/admin/attendance">
        <label>
          Offering
          <select defaultValue={selectedId} name="offeringId">
            {offerings?.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.item_type}: {offering.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input defaultValue={attendedOn} name="date" type="date" />
        </label>
        <button className="button button-primary">Load roster</button>
      </form>
      <section className="report-section">
        <div className="report-heading">
          <div>
            <p className="eyebrow">
              {selectedOffering?.item_type ?? "Program"}
            </p>
            <h2>{selectedOffering?.title ?? "No offering selected"}</h2>
          </div>
          <span>
            {attended.size} of {roster.length} present
          </span>
        </div>
        {roster.length ? (
          <div className="roster-table attendance-table">
            <div className="roster-head">
              <span>Participant</span>
              <span>Attendance date</span>
              <span>Status</span>
              <span>Action</span>
              <span></span>
            </div>
            {roster.map((registration) => {
              const present = attended.has(registration.id);
              return (
                <div className="roster-row" key={registration.id}>
                  <strong>
                    {registration.participants
                      ? `${registration.participants.first_name ?? ""} ${registration.participants.last_name ?? ""}`.trim()
                      : "Participant"}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                    }).format(new Date(`${attendedOn}T12:00:00`))}
                  </span>
                  <span
                    className={
                      present ? "attendance-present" : "attendance-absent"
                    }
                  >
                    {present ? "Present" : "Not marked"}
                  </span>
                  <form action={toggleRegistrationAttendance}>
                    <input
                      name="registrationId"
                      type="hidden"
                      value={registration.id}
                    />
                    <input name="offeringId" type="hidden" value={selectedId} />
                    <input name="attendedOn" type="hidden" value={attendedOn} />
                    <input
                      name="present"
                      type="hidden"
                      value={present ? "false" : "true"}
                    />
                    <button className="button">
                      {present ? "Remove" : "Mark present"}
                    </button>
                  </form>
                  <span />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="admin-empty">
            There are no confirmed registrations for this offering yet.
          </p>
        )}
      </section>
    </main>
  );
}
