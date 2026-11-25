import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Allens Lane Art Center" title="Privacy policy" updated="November 25, 2026">
      <p>Allens Lane Art Center uses this registration portal to process program registrations, store purchases, memberships, donations, event tickets, and account requests.</p>
      <h2>Information we collect</h2>
      <p>We collect the information needed to provide our programs and services, including contact details, participant information supplied by a parent or guardian, purchase history, and support messages. Payment card information is processed by Stripe and is not stored in this portal.</p>
      <h2>How we use information</h2>
      <p>We use this information to manage registrations and orders, communicate about an account or program, provide customer support, improve our services, and meet legal and financial recordkeeping obligations.</p>
      <h2>When information is shared</h2>
      <p>We share information with service providers that help us operate the portal, including Supabase for account and database services, Stripe for payments, Vercel for hosting, and Resend for transactional email. We do not sell personal information.</p>
      <h2>Your choices</h2>
      <p>You may review your account information from your profile and may contact us to ask about correcting information or closing an account, subject to our recordkeeping obligations. Email <a href="mailto:tara@allenslane.org">tara@allenslane.org</a> with a privacy question.</p>
    </LegalPage>
  );
}
