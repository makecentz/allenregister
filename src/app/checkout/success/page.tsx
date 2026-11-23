import Link from "next/link";

export default function CheckoutSuccessPage() {
  return <main className="checkout-success"><p className="eyebrow">Payment submitted</p><h1>Thank you for supporting Allens Lane.</h1><p>Your payment is being confirmed. Once Stripe&apos;s secure confirmation reaches us, your registration status will update in your account.</p><Link className="button button-primary" href="/account">Return to my account</Link></main>;
}
