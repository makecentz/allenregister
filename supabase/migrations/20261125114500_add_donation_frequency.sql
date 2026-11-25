alter table public.donations
  add column frequency text not null default 'one_time' check (frequency in ('one_time', 'monthly')),
  add column stripe_subscription_id text unique;
