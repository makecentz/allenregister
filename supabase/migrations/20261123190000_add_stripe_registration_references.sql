alter table public.registrations
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text;
