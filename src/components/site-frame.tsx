import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart";

export function SiteHeader() {
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
      <div className="header-actions"><CartLink /><Link className="account-link" href="/login">Sign in</Link></div>
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
