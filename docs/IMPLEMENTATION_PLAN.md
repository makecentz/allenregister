# Allens Lane Registration Platform — Implementation Blueprint

## Product goal

Build one Allens Lane Art Center account and checkout experience for classes, summer camp, retail, memberships, gift certificates, donations, and eventually native event ticketing. The customer-facing app must inherit the public Allens Lane site’s header, footer, visual language, and mobile-first behavior.

## Platform decisions

- **Repository:** GitHub (`makecentz/allenregister`)
- **Hosting:** Vercel (`ecomexperts/allenregister`)
- **App framework:** Next.js, deployed from the protected `main` branch
- **Database, auth, and private file storage:** Supabase
- **Payments:** Stripe; card data never enters the application database
- **Environments:** local development, Vercel Preview, staging Supabase/Stripe test mode, and production Supabase/Stripe live mode

## Delivery phases

### Phase 0 — discovery and foundation

**Output:** approved user flows, report catalog, privacy/retention requirements, data migration inventory, and this source-controlled implementation blueprint.

### Phase 1 — application shell and account experience

**Output:** Allens Lane design system, shared header/footer, responsive public routes, customer authentication, password reset, account dashboard, and persistent guest cart.

### Phase 2 — registration MVP

**Output:** class and camp catalog, participant/household profiles, enrollment, capacity, waitlists, forms/waivers, Stripe checkout, confirmations, customer schedule, and staff roster.

### Phase 3 — administration and reports

**Output:** program/session/instructor/location management, attendance, staff roles, communications, refunds/credits, and exportable registration/finance reports.

### Phase 4 — commerce and support

**Output:** store, inventory, gift certificates, memberships, donations, scholarships, discounts, payment plans, and unified order history.

### Phase 5 — native ticketing

**Output:** productions, seasons, venues, performances, tickets, box office, QR tickets, check-in, refunds/exchanges, and event reporting. This phase replaces On The Stage.

### Phase 6 — migration and launch

**Output:** validated migrated data, staff training, staged launch, monitoring, and post-launch backlog.

## Customer routes

- `/classes` — filterable programs, class details, enrollment and waitlist.
- `/camp` — camp-focused discovery and multi-child registration.
- `/events` — mobile-first nested production/performance rows; no calendar-first interface.
- `/shop` — merchandise and art supplies.
- `/gift-certificates` — recipient, amount, message, and delivery preferences.
- `/memberships` — tiers, benefits, renewal, and purchase.
- `/donate` — one-time or monthly donations and tax receipt details.
- `/account` — household, participants, registrations, purchases, memberships, gifts, giving history, and receipts.
- `/cart` and `/checkout` — guests may build a cart; sign-in/sign-up is required before checkout and returns the customer to that cart.

## Initial security model

- Every exposed Supabase table has RLS enabled, grants minimized, and operation-specific policies tested.
- Guardians can access only their household, participant, registration, and order data.
- Instructors can access only rosters assigned to them.
- Finance and administrator access is role-based and audited.
- Health information, waivers, and participant documents use private storage; signed URLs or server authorization control access.
- Privileged keys and Stripe secrets remain server-only. No service-role or secret key is exposed to browsers.
- Administrative edits, discounts, refunds, scholarship decisions, and payment events are recorded in an audit log.

## Registration MVP acceptance criteria

1. A visitor can browse programs without signing in.
2. A guest can add an eligible class or camp session to a cart.
3. Checkout requires sign-in or account creation and preserves the cart after authentication.
4. A guardian can create/manage participant profiles and complete the required form/waiver flow.
5. Capacity, age/grade eligibility, pricing, and waitlist behavior are enforced on the server.
6. Payment is collected through Stripe in test mode; the registration and payment state reconcile via verified webhooks.
7. The customer receives a confirmation and can see the enrollment in `/account`.
8. An authorized staff member can see the roster and a participant’s required operational information.

## Required decisions before payment implementation

- Refund and cancellation policy.
- Fee absorption versus passing processor fees to customers.
- Sales-tax treatment for each product type.
- Scholarship/financial-aid eligibility and approval process.
- Camp medical-data retention and staff-access rules.
- Membership benefits, renewal, and household coverage rules.
- Migration source, data owner, cleanup process, and reconciliation sign-off.
