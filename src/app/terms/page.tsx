import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Allens Lane Art Center" title="Terms of use" updated="November 25, 2026">
      <p>These terms govern your use of the Allens Lane Art Center registration portal. By creating an account, submitting a registration, or completing a purchase, you agree to these terms.</p>
      <h2>Accounts and purchases</h2>
      <p>Please provide accurate information and keep your account credentials private. A parent or legal guardian must create or use an account when registering a minor. Prices, availability, schedules, and program details may change before a purchase is completed.</p>
      <h2>Programs and events</h2>
      <p>Registration is not complete until payment is successfully processed and the portal records a confirmation. We may make reasonable changes to instructors, locations, schedules, or program content when needed to operate a program safely and effectively.</p>
      <h2>Acceptable use</h2>
      <p>Do not interfere with the portal, attempt to access another person’s account, use automated means to collect information, or use the portal for an unlawful purpose.</p>
      <h2>Questions</h2>
      <p>For questions about these terms, contact <a href="mailto:tara@allenslane.org">tara@allenslane.org</a>.</p>
    </LegalPage>
  );
}
