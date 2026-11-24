create table public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete restrict,
  event_session_id uuid not null references public.catalog_sessions(id) on delete restrict,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'inventory_issue', 'cancelled', 'refunded')),
  total_cents integer not null check (total_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_order_id uuid not null references public.ticket_orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  ticket_code text not null unique default upper(replace(gen_random_uuid()::text, '-', '')),
  status text not null default 'reserved' check (status in ('reserved', 'issued', 'checked_in', 'cancelled', 'refunded')),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ticket_orders_account_idx on public.ticket_orders (account_id, created_at desc);
create index tickets_order_idx on public.tickets (ticket_order_id);
create index tickets_code_idx on public.tickets (ticket_code);
alter table public.ticket_orders enable row level security;
alter table public.tickets enable row level security;
revoke all on public.ticket_orders, public.tickets from anon, authenticated;
grant select, insert on public.ticket_orders to authenticated;
grant select, insert, update on public.tickets to authenticated;

create policy "Customers can view their own ticket orders" on public.ticket_orders for select to authenticated using ((select auth.uid()) = account_id or public.is_allens_lane_staff());
create policy "Customers can create their own pending ticket orders" on public.ticket_orders for insert to authenticated with check ((select auth.uid()) = account_id and status = 'pending_payment');
create policy "Customers can view their tickets" on public.tickets for select to authenticated using (exists (select 1 from public.ticket_orders where ticket_orders.id = tickets.ticket_order_id and (ticket_orders.account_id = (select auth.uid()) or public.is_allens_lane_staff())));
create policy "Customers can reserve tickets for their own pending order" on public.tickets for insert to authenticated with check (status = 'reserved' and exists (select 1 from public.ticket_orders where ticket_orders.id = tickets.ticket_order_id and ticket_orders.account_id = (select auth.uid()) and ticket_orders.status = 'pending_payment'));
create policy "Staff can check in issued tickets" on public.tickets for update to authenticated using (public.is_allens_lane_staff() and status in ('issued', 'checked_in')) with check (public.is_allens_lane_staff() and status in ('issued', 'checked_in'));

create or replace function public.complete_ticket_order_payment(checkout_order_id uuid, checkout_session_id text, payment_intent_id text) returns text language plpgsql security definer set search_path = public as $$
declare tier record;
begin
  if not exists (select 1 from public.ticket_orders where id = checkout_order_id and status = 'pending_payment' for update) then return 'already_processed'; end if;
  for tier in select ticket_type_id, count(*)::integer as quantity from public.tickets where ticket_order_id = checkout_order_id group by ticket_type_id loop
    perform 1 from public.ticket_types where id = tier.ticket_type_id and (capacity is null or capacity >= tier.quantity) for update;
    if not found then update public.ticket_orders set status = 'inventory_issue', stripe_checkout_session_id = checkout_session_id, stripe_payment_intent_id = payment_intent_id, updated_at = now() where id = checkout_order_id; return 'inventory_issue'; end if;
  end loop;
  for tier in select ticket_type_id, count(*)::integer as quantity from public.tickets where ticket_order_id = checkout_order_id group by ticket_type_id loop
    update public.ticket_types set capacity = capacity - tier.quantity, updated_at = now() where id = tier.ticket_type_id and capacity is not null;
  end loop;
  update public.tickets set status = 'issued' where ticket_order_id = checkout_order_id and status = 'reserved';
  update public.ticket_orders set status = 'paid', stripe_checkout_session_id = checkout_session_id, stripe_payment_intent_id = payment_intent_id, updated_at = now() where id = checkout_order_id;
  return 'paid';
end;
$$;
revoke all on function public.complete_ticket_order_payment(uuid, text, text) from public, anon, authenticated;
