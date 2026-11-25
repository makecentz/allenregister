import { SiteFrame } from "@/components/site-frame";
import { getActiveDonationFunds } from "@/lib/catalog";
import { beginDonationCheckout } from "@/app/donate/actions";

export const instant = false;

export default async function DonatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const funds = await getActiveDonationFunds();
  return (
    <SiteFrame>
      <main className="catalog-page donate-page">
        <section className="donate-copy">
          <p className="eyebrow">Support the arts</p>
          <h1>Help creativity belong to everyone.</h1>
          <p>
            Your gift supports classes, performances, exhibitions, and community
            programs at Allens Lane Art Center.
          </p>
          {funds.length ? (
            <div className="fund-list">
              <p className="eyebrow">Available funds</p>
              {funds.map((fund) => (
                <p key={fund.id}>
                  <strong>{fund.name}</strong>
                  {fund.description ? (
                    <>
                      <br />
                      <span>{fund.description}</span>
                    </>
                  ) : null}
                </p>
              ))}
            </div>
          ) : null}
        </section>
        <section className="donation-panel">
          <p className="eyebrow">Choose a gift</p>
          {message ? <p className="success-message">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <form action={beginDonationCheckout}>
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
            {funds.length ? (
              <label>
                Apply my gift to
                <select name="fundId">
                  <option value="">General support</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Note (optional)
              <textarea
                name="note"
                placeholder="Share a note with your donation"
                rows={3}
              />
            </label>
            <button className="button button-primary">Donate securely</button>
          </form>
          <p className="small-note">
            One-time gifts are securely processed through Stripe. Monthly giving
            will be added in a later phase.
          </p>
        </section>
      </main>
    </SiteFrame>
  );
}
