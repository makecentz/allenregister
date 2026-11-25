import { LegalPage } from "@/components/legal-page";

export default function CampWaiverPage() {
  return (
    <LegalPage eyebrow="Summer camp" title="Camp participation waiver" updated="November 25, 2026">
      <p>By accepting this waiver during camp registration, the parent or legal guardian confirms that they have authority to enroll the named participant in Allens Lane Art Center camp programs.</p>
      <h2>Participation and health</h2>
      <p>I understand that art activities and camp programs can include ordinary risks such as use of art materials, movement around the facility, and supervised outdoor activities. I will provide accurate health, allergy, accessibility, and emergency-contact information, and will notify the center of changes that could affect safe participation.</p>
      <h2>Emergency care</h2>
      <p>If I cannot be reached in an emergency, I authorize Allens Lane Art Center staff to seek reasonable emergency care for the participant. I understand that I am responsible for related costs not covered by insurance.</p>
      <h2>Release and conduct</h2>
      <p>To the extent permitted by law, I accept the ordinary risks of participation and agree not to hold Allens Lane Art Center responsible for injuries or losses arising from those ordinary risks. I understand that participants must follow staff directions and program conduct expectations.</p>
      <h2>Permission to contact</h2>
      <p>I agree that the center may contact me about the participant’s program, schedule changes, safety matters, and pickup needs. Questions about this waiver may be sent to <a href="mailto:tara@allenslane.org">tara@allenslane.org</a>.</p>
    </LegalPage>
  );
}
