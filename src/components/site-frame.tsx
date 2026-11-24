import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims;
  const displayName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.split(" ")[0] : user?.email?.split("@")[0];
  const { data: staffRole } = user ? await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle() : { data: null };
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Allens Lane Art Center home">
        <Image
          src="/allens-lane-art-center-logo.png"
          alt="Allens Lane Art Center"
          width={475}
          height={295}
          priority
        />
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/classes">Classes</Link>
        <Link href="/instructors">Instructors</Link>
        <Link href="/camp">Summer camp</Link>
        <Link href="/events">Events</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/memberships">Membership</Link>
        <Link href="/donate">Donate</Link>
      </nav>
      <div className="header-actions"><CartLink />{user ? <div className="profile-menu"><Link className="account-link" href="/account">{displayName ? `Hi, ${displayName}` : "My account"}</Link>{staffRole ? <Link className="profile-admin-link" href="/admin">Admin</Link> : null}</div> : <Link className="account-link" href="/login">Sign in</Link>}</div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p><strong>Allens Lane Art Center</strong><br />601 W Allens Lane · Philadelphia, PA 19119</p>
      <div>
        <Link href="/gift-certificates">Gift certificates</Link>
        <Link href="/account">My account</Link>
        <Link href="/contact">Contact</Link>
      </div>
    </footer>
  );
}

export function SiteFrame({ children }: { children: ReactNode }) {
  return <div className="site-shell"><SiteHeader />{children}<SiteFooter /></div>;
}
