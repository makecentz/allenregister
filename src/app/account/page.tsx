import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { beginRegistrationCheckout } from "@/app/checkout/actions";
import { SiteFrame } from "@/components/site-frame";
import { saveParticipant, saveProfile } from "@/app/account/actions";
import { withdrawFromWaitlist } from "@/app/waitlist/actions";
import { isMembershipActive } from "@/lib/membership-status";

export const instant = false;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error } = await searchParams;
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login");
  const name =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  let { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.sub)
    .maybeSingle();
  if (!profile) {
    const { data: createdProfile } = await supabase
      .from("profiles")
      .insert({ id: user.sub, full_name: name })
      .select("full_name")
      .single();
    profile = createdProfile;
  }
  const displayName = profile?.full_name || user.email || "Allens Lane member";
  const { data: staffRole } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id,status,created_at,catalog_items(title,item_type)")
    .eq("account_id", user.sub)
    .order("created_at", { ascending: false });
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id,status,subtotal_cents,created_at,order_items(title,quantity,item_type)",
    )
    .eq("account_id", user.sub)
    .order("created_at", { ascending: false });
  const { data: membershipRecords } = await supabase
    .from("memberships")
    .select("id,status,starts_at,expires_at,catalog_items(title)")
    .eq("account_id", user.sub)
    .order("expires_at", { ascending: false });
  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id,ticket_code,status,ticket_types(name,catalog_sessions(starts_at,location,catalog_items(title))),ticket_orders!inner(account_id)",
    )
    .eq("ticket_orders.account_id", user.sub)
    .in("status", ["issued", "checked_in"])
    .order("created_at", { ascending: false });
  const { data: participants } = await supabase
    .from("participants")
    .select("id,first_name,last_name,birth_date")
    .eq("account_id", user.sub)
    .order("first_name");
  const { data: donations } = await supabase
    .from("donations")
    .select("id,status,amount_cents,created_at,donation_funds(name)")
    .eq("account_id", user.sub)
    .order("created_at", { ascending: false });
  const { data: giftCertificates } = await supabase
    .from("gift_certificates")
    .select("id,recipient_name,code,balance_cents,status,created_at")
    .eq("purchaser_id", user.sub)
    .order("created_at", { ascending: false });
  const { data: waitlistEntries } = await supabase
    .from("waitlist_entries")
    .select(
      "id,status,created_at,catalog_item_id,catalog_items(title,item_type),participants(id,first_name,last_name)",
    )
    .eq("account_id", user.sub)
    .in("status", ["waiting", "offered"])
    .order("created_at", { ascending: true });
  const memberships = (membershipRecords ?? []).map((membership) => ({
    ...membership,
    isActive: isMembershipActive(membership.status, membership.expires_at),
  }));
  const activeMemberships = memberships.filter((membership) => membership.isActive);
  return (
    <SiteFrame>
      <main className="account-page">
        <Link href="/">← Back to home</Link>
        <p className="eyebrow">My Allens Lane</p>
        <h1>Welcome, {displayName}</h1>
        <p className="account-lead">
          Your registrations, purchases, memberships, and giving history will
          appear here.
        </p>
        {message ? <p className="success-message">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {staffRole ? (
          <section className="staff-access">
            <p className="eyebrow">Staff access</p>
            <h2>Manage Allens Lane</h2>
            <p>
              You are signed in as an {staffRole.role}. Create offerings, manage
              donation funds, and review registration reports.
            </p>
            <div>
              <Link className="button button-primary" href="/admin">
                Open staff dashboard
              </Link>
              <Link href="/admin/reports">View reports</Link>
            </div>
          </section>
        ) : null}
        <div className="account-grid">
          <section>
            <h2>Upcoming experiences</h2>
            {registrations?.length ? (
              <div className="registration-list">
                {registrations.map((registration) => (
                  <div className="registration-entry" key={registration.id}>
                    <strong>
                      {(registration.catalog_items as { title?: string } | null)
                        ?.title ?? "Allens Lane experience"}
                    </strong>
                    <br />
                    <span className="registration-status">
                      {registration.status.replace("_", " ")}
                    </span>
                    {registration.status === "draft" ? (
                      <form action={beginRegistrationCheckout}>
                        <input
                          type="hidden"
                          name="registrationId"
                          value={registration.id}
                        />
                        <label className="gift-code-field">
                          Gift certificate code <span>(optional)</span>
                          <input
                            autoCapitalize="characters"
                            name="giftCertificateCode"
                            placeholder="ALAC-XXXX"
                          />
                        </label>
                        <button className="button button-primary">
                          Pay tuition
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p>
                  You do not have any upcoming classes or camp registrations
                  yet.
                </p>
                <Link className="button button-primary" href="/classes">
                  Browse classes
                </Link>
              </>
            )}
          </section>
          <section>
            <h2>Profile</h2>
            <dl>
              <dt>Email</dt>
              <dd>{user.email}</dd>
              <dt>Membership</dt>
              <dd>
                {activeMemberships.length
                  ? activeMemberships
                      .map(
                        (membership) =>
                          (membership.catalog_items as { title?: string } | null)
                            ?.title ?? "Allens Lane membership",
                      )
                      .join(", ")
                  : "Not yet enrolled"}
              </dd>
            </dl>
            <form className="profile-form" action={saveProfile}>
              <label>
                Full name
                <input
                  defaultValue={profile?.full_name || name}
                  maxLength={120}
                  name="fullName"
                  required
                />
              </label>
              <button className="button">Save profile</button>
            </form>
            <Link href="/memberships">
              {activeMemberships.length
                ? "Explore another membership"
                : "Explore memberships"}
            </Link>
          </section>
        </div>
        <section className="account-purchases">
          <p className="eyebrow">Household</p>
          <h2>Participants</h2>
          <div className="participant-list">
            {participants?.map((participant) => (
              <form action={saveParticipant} key={participant.id}>
                <input
                  name="participantId"
                  type="hidden"
                  value={participant.id}
                />
                <label>
                  First name
                  <input
                    defaultValue={participant.first_name}
                    name="firstName"
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    defaultValue={participant.last_name}
                    name="lastName"
                    required
                  />
                </label>
                <label>
                  Date of birth
                  <input
                    defaultValue={participant.birth_date ?? ""}
                    name="birthDate"
                    type="date"
                  />
                </label>
                <button className="button">Save changes</button>
              </form>
            ))}
          </div>
          <form className="participant-add" action={saveParticipant}>
            <p className="eyebrow">Add participant</p>
            <label>
              First name
              <input name="firstName" required />
            </label>
            <label>
              Last name
              <input name="lastName" required />
            </label>
            <label>
              Date of birth
              <input name="birthDate" type="date" />
            </label>
            <button className="button button-primary">Add participant</button>
          </form>
        </section>
        <section className="account-purchases">
          <p className="eyebrow">Membership</p>
          <h2>Your membership</h2>
          {memberships.length ? (
            <div className="registration-list">
              {memberships.map((membership) => {
                const plan = membership.catalog_items as {
                  title?: string;
                } | null;
                return (
                  <div className="registration-entry" key={membership.id}>
                    <strong>{plan?.title ?? "Allens Lane membership"}</strong>
                    <br />
                    <span className="registration-status">
                      {membership.isActive ? "active" : "expired"} · ends{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                      }).format(new Date(membership.expires_at))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>
              Your membership status will appear here after a membership
              purchase.
            </p>
          )}
        </section>
        <section className="account-purchases">
          <p className="eyebrow">Waitlists</p>
          <h2>Your place in line</h2>
          {waitlistEntries?.length ? (
            <div className="registration-list">
              {waitlistEntries.map((entry) => {
                const item = entry.catalog_items as {
                  title?: string;
                  item_type?: string;
                } | null;
                const participant = entry.participants as {
                  id?: string;
                  first_name?: string;
                  last_name?: string;
                } | null;
                return (
                  <div className="registration-entry" key={entry.id}>
                    <strong>{item?.title ?? "Allens Lane offering"}</strong>
                    <br />
                    <span>
                      {participant?.first_name} {participant?.last_name} ·{" "}
                      {entry.status === "offered" ? "space offered" : "waiting"}
                    </span>
                    <form action={withdrawFromWaitlist}>
                      <input name="entryId" type="hidden" value={entry.id} />
                      <button className="button">Leave waitlist</button>
                    </form>
                    {entry.status === "offered" && participant?.id ? (
                      <Link
                        className="button button-primary"
                        href={`/register/${entry.catalog_item_id}?waitlistEntry=${entry.id}`}
                      >
                        Register now
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p>You are not currently waiting for a class or camp space.</p>
          )}
        </section>
        <section className="account-purchases">
          <p className="eyebrow">Event tickets</p>
          <h2>Your ticket wallet</h2>
          {tickets?.length ? (
            <div className="registration-list">
              {tickets.map((ticket) => {
                const type = ticket.ticket_types as unknown as {
                  name?: string;
                  catalog_sessions?: {
                    starts_at?: string;
                    catalog_items?: { title?: string } | null;
                  } | null;
                } | null;
                return (
                  <div className="registration-entry" key={ticket.id}>
                    <strong>
                      {type?.catalog_sessions?.catalog_items?.title ??
                        "Allens Lane event"}
                    </strong>
                    <br />
                    <span>
                      {type?.name ?? "Admission"} ·{" "}
                      {ticket.status.replace("_", " ")}
                    </span>
                    <br />
                    <Link
                      className="button"
                      href={`/account/tickets/${ticket.id}`}
                    >
                      Open ticket pass
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>Your event tickets will appear here after purchase.</p>
          )}
        </section>
        <section className="account-purchases">
          <p className="eyebrow">Purchases & memberships</p>
          <h2>Order history</h2>
          {orders?.length ? (
            <div className="registration-list">
              {orders.map((order) => (
                <div className="registration-entry" key={order.id}>
                  <strong>
                    {(
                      order.order_items as
                        { title: string; quantity: number }[] | null
                    )
                      ?.map((item) => `${item.quantity} × ${item.title}`)
                      .join(", ") || "Allens Lane order"}
                  </strong>
                  <br />
                  <span className="registration-status">
                    {order.status.replace("_", " ")} · $
                    {(order.subtotal_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>You have not placed an order yet.</p>
          )}
        </section>
        <section className="account-purchases">
          <p className="eyebrow">Gift certificates</p>
          <h2>Your gift certificates</h2>
          {giftCertificates?.length ? (
            <div className="registration-list">
              {giftCertificates.map((certificate) => (
                <div className="registration-entry" key={certificate.id}>
                  <strong>{certificate.recipient_name}</strong>
                  <br />
                  <span className="registration-status">
                    {certificate.status.replace("_", " ")} · $
                    {(certificate.balance_cents / 100).toFixed(2)} remaining
                  </span>
                  <br />
                  {certificate.status === "issued" ? (
                    <code>{certificate.code}</code>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p>
              Gift certificates you purchase will appear here after payment.
            </p>
          )}
        </section>
        <section className="account-purchases">
          <p className="eyebrow">Giving</p>
          <h2>Donation history</h2>
          {donations?.length ? (
            <div className="registration-list">
              {donations.map((donation) => (
                <div className="registration-entry" key={donation.id}>
                  <strong>
                    {(donation.donation_funds as { name?: string } | null)
                      ?.name ?? "General support"}
                  </strong>
                  <br />
                  <span className="registration-status">
                    {donation.status.replace("_", " ")} · $
                    {(donation.amount_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>Your completed donations will appear here.</p>
          )}
        </section>
      </main>
    </SiteFrame>
  );
}
