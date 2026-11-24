import { CartContents } from "@/components/cart";
import { SiteFrame } from "@/components/site-frame";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function CartPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  const { data: registrations } = user
    ? await supabase
        .from("registrations")
        .select("id,catalog_item_id,status")
        .eq("account_id", user.sub)
        .in("status", ["draft", "confirmed"])
    : { data: [] };
  const cartRegistrations = (registrations ?? []).map((registration) => ({
    id: registration.id,
    catalogItemId: registration.catalog_item_id,
    status: registration.status as "draft" | "confirmed",
  }));
  return (
    <SiteFrame>
      <main className="cart-page">
        <p className="eyebrow">Your selections</p>
        <CartContents
          signedIn={Boolean(user)}
          registrations={cartRegistrations}
        />
      </main>
    </SiteFrame>
  );
}
