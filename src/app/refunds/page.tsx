import { LegalPage } from "@/components/legal-page";

export default function RefundsPage() {
  return (
    <LegalPage eyebrow="Allens Lane Art Center" title="Refund & cancellation policy" updated="November 25, 2026">
      <p>This is the current sample refund and cancellation policy for the registration portal. Allens Lane Art Center may update it as program policies are finalized.</p>
      <h2>Classes and camps</h2>
      <p>Cancellation requests should be sent as early as possible to <a href="mailto:tara@allenslane.org">tara@allenslane.org</a>. When a cancellation is approved, the center may issue a refund, account credit, or transfer to another available program, depending on timing, staffing, materials already purchased, and program capacity.</p>
      <h2>Events and tickets</h2>
      <p>Tickets are generally final sale unless an event is cancelled, materially rescheduled, or otherwise required by law. If an event is cancelled, the center will communicate the available refund or credit options to ticket holders.</p>
      <h2>Shop items, memberships, and donations</h2>
      <p>Unused merchandise may be eligible for return in its original condition. Memberships, donations, and gift certificates are generally nonrefundable. Please contact us promptly if there is a billing problem or an order issue.</p>
    </LegalPage>
  );
}
