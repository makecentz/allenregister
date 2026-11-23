# Stripe test checkout setup

Add these environment variables to the `allenregister` Vercel project for Development, Preview, and Production. Never commit their values.

- `STRIPE_SECRET_KEY` — Stripe test secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe test publishable key
- `STRIPE_WEBHOOK_SECRET` — signing secret for the Stripe webhook destination
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key used by the signed webhook to confirm paid registrations

Create a **test-mode** Stripe webhook destination after deployment:

- Endpoint URL: `https://allenregister.vercel.app/api/stripe/webhook`
- Event: `checkout.session.completed`

Copy that destination's `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`. The service-role key is available in the Supabase project API settings; it must remain server-only.
