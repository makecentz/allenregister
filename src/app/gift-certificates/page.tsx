import { SiteFrame } from "@/components/site-frame";
import { beginGiftCertificateCheckout } from "@/app/gift-certificates/actions";

export const instant = false;

export default async function GiftCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  return (
    <SiteFrame>
      <main className="catalog-page gift-page">
        <section className="gift-art" aria-hidden="true">
          <span>
            GIVE
            <br />
            ART
          </span>
        </section>
        <section className="gift-copy">
          <p className="eyebrow">Gift certificates</p>
          <h1>Give someone a creative day.</h1>
          <p>
            Gift certificates can be used toward classes, summer camp, events,
            and shop purchases.
          </p>
          {message ? <p className="success-message">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <form action={beginGiftCertificateCheckout}>
            <label>
              Gift amount (USD)
              <input
                defaultValue="25"
                inputMode="decimal"
                min="1"
                name="amount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label>
              Recipient’s name
              <input name="recipientName" required />
            </label>
            <label>
              Recipient’s email (optional)
              <input name="recipientEmail" type="email" />
            </label>
            <label>
              Gift message (optional)
              <textarea name="message" rows={3} />
            </label>
            <button className="button button-primary">
              Purchase gift certificate
            </button>
          </form>
          <p className="small-note">
            An account is required at checkout. Certificate codes are issued
            after Stripe confirms payment; redemption will be added in the next
            commerce phase.
          </p>
        </section>
      </main>
    </SiteFrame>
  );
}
