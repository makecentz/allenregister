import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { beginRegistrationCheckout } from "@/app/checkout/actions";
import { SiteFrame } from "@/components/site-frame";

export const instant = false;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const { message, error } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login");
  const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const { data: profile } = await supabase.from("profiles").upsert({ id: user.sub, full_name: name }).select("full_name").single();
  const displayName = profile?.full_name || user.email || "Allens Lane member";
  const { data: staffRole } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();

  const { data: registrations } = await supabase.from("registrations").select("id,status,created_at,catalog_items(title,item_type)").eq("account_id", user.sub).order("created_at", { ascending: false });
  const { data: orders } = await supabase.from("orders").select("id,status,subtotal_cents,created_at,order_items(title,quantity)").eq("account_id", user.sub).order("created_at", { ascending: false });
  return <SiteFrame><main className="account-page"><Link href="/">← Back to home</Link><p className="eyebrow">My Allens Lane</p><h1>Welcome, {displayName}</h1><p className="account-lead">Your registrations, purchases, memberships, and giving history will appear here.</p>{message ? <p className="success-message">{message}</p> : null}{error ? <p className="form-error">{error}</p> : null}{staffRole ? <section className="staff-access"><p className="eyebrow">Staff access</p><h2>Manage Allens Lane</h2><p>You are signed in as an {staffRole.role}. Create offerings, manage donation funds, and review registration reports.</p><div><Link className="button button-primary" href="/admin">Open staff dashboard</Link><Link href="/admin/reports">View reports</Link></div></section> : null}<div className="account-grid"><section><h2>Upcoming experiences</h2>{registrations?.length ? <div className="registration-list">{registrations.map((registration) => <div className="registration-entry" key={registration.id}><strong>{(registration.catalog_items as { title?: string } | null)?.title ?? "Allens Lane experience"}</strong><br /><span className="registration-status">{registration.status.replace("_", " ")}</span>{registration.status === "draft" ? <form action={beginRegistrationCheckout}><input type="hidden" name="registrationId" value={registration.id} /><button className="button button-primary">Pay test tuition</button></form> : null}</div>)}</div> : <><p>You do not have any upcoming classes or camp registrations yet.</p><Link className="button button-primary" href="/classes">Browse classes</Link></>}</section><section><h2>Your account</h2><dl><dt>Email</dt><dd>{user.email}</dd><dt>Membership</dt><dd>Not yet enrolled</dd></dl><Link href="/memberships">Explore memberships</Link></section></div><section className="account-purchases"><p className="eyebrow">Shop purchases</p><h2>Order history</h2>{orders?.length ? <div className="registration-list">{orders.map((order) => <div className="registration-entry" key={order.id}><strong>{(order.order_items as { title: string; quantity: number }[] | null)?.map((item) => `${item.quantity} × ${item.title}`).join(", ") || "Allens Lane shop order"}</strong><br /><span className="registration-status">{order.status.replace("_", " ")} · ${(order.subtotal_cents / 100).toFixed(2)}</span></div>)}</div> : <p>You have not placed a shop order yet.</p>}</section></main></SiteFrame>;
}
