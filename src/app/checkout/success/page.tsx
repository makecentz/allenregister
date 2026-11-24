import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

export default function CheckoutSuccessPage() {
  return <SiteFrame><main className="checkout-success"><p className="eyebrow">Payment submitted</p><h1>Thank you for supporting Allens Lane.</h1><p>Stripe is securely confirming your payment now. Your class or camp registration, shop order, and event tickets will appear in your account as soon as the confirmation is complete.</p><div className="checkout-success-actions"><Link className="button button-primary" href="/account">Open my account</Link><Link className="button button-secondary" href="/events">Browse events</Link></div></main></SiteFrame>;
}
