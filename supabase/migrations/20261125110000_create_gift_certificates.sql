create table public.gift_certificates (
  id uuid primary key default gen_random_uuid(),
  purchaser_id uuid not null references auth.users(id) on delete restrict,
  recipient_name text not null,
  recipient_email text,
  message text,
  code text not null unique,
  initial_amount_cents integer not null check (initial_amount_cents >= 100),
  balance_cents integer not null check (balance_cents >= 0),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'issued', 'redeemed', 'cancelled', 'expired')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gift_certificates_purchaser_idx on public.gift_certificates (purchaser_id, created_at desc);
alter table public.gift_certificates enable row level security;
revoke all on public.gift_certificates from anon, authenticated;
grant select, insert on public.gift_certificates to authenticated;
create policy "Customers can view their own gift certificates" on public.gift_certificates for select to authenticated using ((select auth.uid()) = purchaser_id or public.is_allens_lane_staff());
create policy "Customers can start gift certificates" on public.gift_certificates for insert to authenticated with check ((select auth.uid()) = purchaser_id and status = 'pending_payment');
