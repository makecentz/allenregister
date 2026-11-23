import Link from "next/link";
import { redirect } from "next/navigation";
import { createDonationFund } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function NewDonationFundPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect("/login?next=/admin/funds/new");
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Add donation fund</h1></div><Link className="admin-home" href="/admin/funds">← Donation funds</Link></header><form className="admin-form" action={createDonationFund}><label>Fund name<input name="name" required placeholder="Annual Fund – General Support" /></label><label>Description<textarea name="description" rows={4} placeholder="Where this gift will make an impact" /></label><button className="button button-primary">Save fund</button></form></main>;
}
