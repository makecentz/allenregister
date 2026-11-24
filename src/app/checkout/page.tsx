import Link from "next/link";
import { CartContents } from "@/components/cart";
import { SiteFrame } from "@/components/site-frame";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user)
    return (
      <SiteFrame>
        <main className="checkout-gate">
          <p className="eyebrow">Checkout</p>
          <h1>Ready to make it official?</h1>
          <p>
            Create an account or sign in to securely save your cart,
            registration details, purchases, and payment history.
          </p>
          <div>
            <Link
              className="button button-primary"
              href="/signup?next=/checkout"
            >
              Create an account
            </Link>
            <Link
              className="button button-secondary"
              href="/login?next=/checkout"
            >
              Sign in
            </Link>
          </div>
          <Link className="browse-link" href="/cart">
            ← Return to cart
          </Link>
        </main>
      </SiteFrame>
    );
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id,catalog_item_id,status")
    .eq("account_id", user.sub)
    .in("status", ["draft", "confirmed"]);
  const cartRegistrations = (registrations ?? []).map((registration) => ({
    id: registration.id,
    catalogItemId: registration.catalog_item_id,
    status: registration.status as "draft" | "confirmed",
  }));
  return (
    <SiteFrame>
      <main className="cart-page">
        <p className="eyebrow">Checkout</p>
        <CartContents signedIn registrations={cartRegistrations} />
      </main>
    </SiteFrame>
  );
}
