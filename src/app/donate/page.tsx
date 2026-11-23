import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

export default function DonatePage() {
  return <SiteFrame><main className="catalog-page donate-page"><section className="donate-copy"><p className="eyebrow">Support the arts</p><h1>Help creativity belong to everyone.</h1><p>Your gift supports classes, performances, exhibitions, and community programs at Allens Lane Art Center.</p></section><section className="donation-panel"><p className="eyebrow">Choose a gift</p><div className="gift-options"><span>$25</span><span>$50</span><span>$100</span><span>$250</span><span>$500</span></div><label className="other-gift">Or enter another amount<input inputMode="decimal" placeholder="$ 0.00" /></label><label className="check-label"><input type="checkbox" /> Make this a monthly gift</label><Link className="button button-primary" href="/signup?next=/donate">Continue to donate</Link><p className="small-note">Secure payment will be available when checkout launches.</p></section></main></SiteFrame>;
}
