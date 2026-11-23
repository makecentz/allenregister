import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";

const plans = [
  { name: "The Maker", audience: "Individual", price: "$55", description: "For an individual who wants to make, learn, and help sustain creative experiences in the community." },
  { name: "The Collective", audience: "Family", price: "$95", description: "For artistic families: covers two adults and up to five children in one household." },
] as const;

export default function MembershipsPage() {
  return <SiteFrame><main className="catalog-page"><section className="catalog-intro"><p className="eyebrow">Membership</p><h1>Make Allens Lane yours.</h1><p>Memberships are tax-deductible charitable donations that help make the arts accessible to our community.</p></section><section className="membership-grid">{plans.map((plan) => <article className="membership-card" key={plan.name}><p className="eyebrow">{plan.audience}</p><h2>{plan.name}</h2><strong className="membership-price">{plan.price}<small> / year</small></strong><p>{plan.description}</p><Link className="button button-primary" href="/signup?next=/memberships">Become a member</Link></article>)}</section></main></SiteFrame>;
}
