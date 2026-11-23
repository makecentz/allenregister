import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login");
  const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const { data: profile } = await supabase.from("profiles").upsert({ id: user.sub, full_name: name }).select("full_name").single();
  const displayName = profile?.full_name || user.email || "Allens Lane member";

  return <main className="account-page"><Link href="/">← Back to home</Link><p className="eyebrow">My Allens Lane</p><h1>Welcome, {displayName}</h1><p className="account-lead">Your registrations, purchases, memberships, and giving history will appear here.</p><div className="account-grid"><section><h2>Upcoming experiences</h2><p>You do not have any upcoming classes or camp registrations yet.</p><Link className="button button-primary" href="/classes">Browse classes</Link></section><section><h2>Your account</h2><dl><dt>Email</dt><dd>{user.email}</dd><dt>Membership</dt><dd>Not yet enrolled</dd></dl><Link href="/memberships">Explore memberships</Link></section></div></main>;
}
