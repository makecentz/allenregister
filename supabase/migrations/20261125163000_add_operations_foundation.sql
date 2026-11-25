alter table public.registrations
  add column if not exists checkout_expires_at timestamptz;

create index if not exists registrations_capacity_idx
  on public.registrations (catalog_item_id, status, checkout_expires_at);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete restrict,
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'enrolled', 'withdrawn')),
  staff_note text,
  offered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, catalog_item_id, participant_id)
);

create index waitlist_entries_catalog_idx
  on public.waitlist_entries (catalog_item_id, status, created_at);

alter table public.waitlist_entries enable row level security;
revoke all on public.waitlist_entries from anon, authenticated;
grant select, insert, update on public.waitlist_entries to authenticated;

create policy "Customers can view their own waitlist entries"
on public.waitlist_entries for select to authenticated
using ((select auth.uid()) = account_id or public.is_allens_lane_staff());

create policy "Customers can join a waitlist for their participant"
on public.waitlist_entries for insert to authenticated
with check (
  (select auth.uid()) = account_id
  and status = 'waiting'
  and exists (
    select 1 from public.participants
    where participants.id = waitlist_entries.participant_id
      and participants.account_id = (select auth.uid())
  )
  and exists (
    select 1 from public.catalog_items
    where catalog_items.id = waitlist_entries.catalog_item_id
      and catalog_items.status = 'published'
      and catalog_items.item_type in ('class', 'camp')
  )
);

create policy "Customers can withdraw their own waitlist entry"
on public.waitlist_entries for update to authenticated
using ((select auth.uid()) = account_id)
with check ((select auth.uid()) = account_id and status = 'withdrawn');

create policy "Staff can manage waitlists"
on public.waitlist_entries for all to authenticated
using (public.is_allens_lane_staff())
with check (public.is_allens_lane_staff());

create table public.gift_certificate_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_certificate_id uuid not null references public.gift_certificates(id) on delete restrict,
  order_id uuid references public.orders(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'reserved' check (status in ('reserved', 'applied', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  check (num_nonnulls(order_id, registration_id) = 1)
);

create unique index gift_redemption_order_active_idx
  on public.gift_certificate_redemptions (order_id)
  where status in ('reserved', 'applied');
create unique index gift_redemption_registration_active_idx
  on public.gift_certificate_redemptions (registration_id)
  where status in ('reserved', 'applied');
create index gift_redemptions_certificate_idx
  on public.gift_certificate_redemptions (gift_certificate_id, status, expires_at);

alter table public.gift_certificate_redemptions enable row level security;
revoke all on public.gift_certificate_redemptions from anon, authenticated;

alter table public.orders
  add column if not exists fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'processing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled')),
  add column if not exists fulfillment_note text,
  add column if not exists tracking_number text,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists refunded_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending_payment', 'paid', 'cancelled', 'inventory_issue', 'refund_pending', 'refunded'));

create or replace function public.reserve_registration_for_payment(p_registration_id uuid)
returns table (registration_id uuid, price_cents integer, title text, checkout_session_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  registration_row public.registrations%rowtype;
  item_row public.catalog_items%rowtype;
  occupied_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in is required to complete registration.';
  end if;

  select * into registration_row
  from public.registrations
  where id = p_registration_id and account_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Registration was not found.';
  end if;
  if registration_row.status = 'confirmed' then
    raise exception 'This registration has already been confirmed.';
  end if;
  if registration_row.status = 'pending_payment'
    and registration_row.checkout_expires_at > now()
    and registration_row.stripe_checkout_session_id is not null then
    return query select registration_row.id, registration_row.price_cents, ''::text, registration_row.stripe_checkout_session_id;
    return;
  end if;

  select * into item_row
  from public.catalog_items
  where id = registration_row.catalog_item_id
    and status = 'published'
    and item_type in ('class', 'camp')
  for update;
  if not found then
    raise exception 'This offering is no longer available.';
  end if;
  if coalesce(item_row.metadata->>'availability', 'open') = 'waitlist' then
    raise exception 'This offering is currently available by waitlist only.';
  end if;

  select count(*)::integer into occupied_count
  from public.registrations
  where catalog_item_id = item_row.id
    and (status = 'confirmed' or (status = 'pending_payment' and checkout_expires_at > now()))
    and id <> registration_row.id;
  if item_row.capacity is not null and occupied_count >= item_row.capacity then
    raise exception 'This offering has reached capacity. Please join the waitlist.';
  end if;

  update public.registrations
  set status = 'pending_payment',
      checkout_expires_at = now() + interval '30 minutes',
      stripe_checkout_session_id = null,
      updated_at = now()
  where id = registration_row.id;
  return query select registration_row.id, registration_row.price_cents, item_row.title, null::text;
end;
$$;

create or replace function public.reserve_gift_certificate_redemption(
  p_code text,
  p_order_id uuid default null,
  p_registration_id uuid default null
)
returns table (redemption_id uuid, amount_cents integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  certificate_row public.gift_certificates%rowtype;
  target_amount integer;
  held_amount integer;
  available_amount integer;
  created_redemption_id uuid;
begin
  if num_nonnulls(p_order_id, p_registration_id) <> 1 then
    raise exception 'A single order or registration is required.';
  end if;

  select * into certificate_row
  from public.gift_certificates
  where upper(code) = upper(trim(p_code))
    and status = 'issued'
    and balance_cents > 0
  for update;
  if not found then
    raise exception 'That gift certificate is not available.';
  end if;

  select coalesce(sum(amount_cents), 0)::integer into held_amount
  from public.gift_certificate_redemptions
  where gift_certificate_id = certificate_row.id
    and status = 'reserved'
    and expires_at > now();
  available_amount := certificate_row.balance_cents - held_amount;
  if available_amount <= 0 then
    raise exception 'That gift certificate has no available balance.';
  end if;

  if p_order_id is not null then
    select subtotal_cents into target_amount from public.orders where id = p_order_id for update;
  else
    select price_cents into target_amount from public.registrations where id = p_registration_id for update;
  end if;
  if target_amount is null or target_amount <= 0 then
    raise exception 'That purchase is not available for gift certificate payment.';
  end if;

  insert into public.gift_certificate_redemptions (gift_certificate_id, order_id, registration_id, amount_cents, expires_at)
  values (certificate_row.id, p_order_id, p_registration_id, least(available_amount, target_amount), now() + interval '30 minutes')
  returning id, amount_cents into created_redemption_id, target_amount;
  return query select created_redemption_id, target_amount;
end;
$$;

create or replace function public.finalize_gift_certificate_redemption(
  p_order_id uuid default null,
  p_registration_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  redemption_row public.gift_certificate_redemptions%rowtype;
  certificate_row public.gift_certificates%rowtype;
begin
  for redemption_row in
    select * from public.gift_certificate_redemptions
    where ((p_order_id is not null and order_id = p_order_id) or (p_registration_id is not null and registration_id = p_registration_id))
      and status = 'reserved'
    for update
  loop
    select * into certificate_row from public.gift_certificates where id = redemption_row.gift_certificate_id for update;
    if not found or certificate_row.balance_cents < redemption_row.amount_cents then
      raise exception 'Gift certificate balance is no longer available.';
    end if;
    update public.gift_certificates
    set balance_cents = balance_cents - redemption_row.amount_cents,
        status = case when balance_cents - redemption_row.amount_cents = 0 then 'redeemed' else 'issued' end,
        updated_at = now()
    where id = certificate_row.id;
    update public.gift_certificate_redemptions
    set status = 'applied', applied_at = now()
    where id = redemption_row.id;
  end loop;
  return 'applied';
end;
$$;

create or replace function public.release_gift_certificate_redemption(
  p_order_id uuid default null,
  p_registration_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gift_certificate_redemptions
  set status = 'released'
  where ((p_order_id is not null and order_id = p_order_id) or (p_registration_id is not null and registration_id = p_registration_id))
    and status = 'reserved';
  return 'released';
end;
$$;

revoke all on function public.reserve_registration_for_payment(uuid) from public, anon;
grant execute on function public.reserve_registration_for_payment(uuid) to authenticated;
revoke all on function public.reserve_gift_certificate_redemption(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_gift_certificate_redemption(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_gift_certificate_redemption(uuid, uuid) from public, anon, authenticated;
