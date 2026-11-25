create table public.donations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete restrict,
  donation_fund_id uuid references public.donation_funds(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 100),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'cancelled', 'refunded')),
  note text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index donations_account_idx on public.donations (account_id, created_at desc);
alter table public.donations enable row level security;
revoke all on public.donations from anon, authenticated;
grant select, insert on public.donations to authenticated;
create policy "Customers can view their own donations" on public.donations for select to authenticated using ((select auth.uid()) = account_id or public.is_allens_lane_staff());
create policy "Customers can start donations" on public.donations for insert to authenticated with check ((select auth.uid()) = account_id and status = 'pending_payment');
