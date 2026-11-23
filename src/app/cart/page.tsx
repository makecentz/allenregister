import { CartContents } from "@/components/cart";
import { SiteFrame } from "@/components/site-frame";

export default function CartPage() {
  return <SiteFrame><main className="cart-page"><p className="eyebrow">Your selections</p><CartContents /></main></SiteFrame>;
}
