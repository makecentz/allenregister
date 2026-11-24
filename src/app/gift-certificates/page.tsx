import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

export const instant = false;

export default function GiftCertificatesPage() {
  return <SiteFrame><main className="catalog-page gift-page"><section className="gift-art" aria-hidden="true"><span>GIVE<br />ART</span></section><section className="gift-copy"><p className="eyebrow">Gift certificates</p><h1>Give someone a creative day.</h1><p>Gift certificates can be used toward classes, summer camp, events, and shop purchases.</p><div className="gift-options"><span>$25</span><span>$50</span><span>$100</span><span>$250</span></div><Link className="button button-primary" href="/signup?next=/gift-certificates">Choose an amount</Link><p className="small-note">An account is needed to purchase and deliver a gift certificate securely.</p></section></main></SiteFrame>;
}
