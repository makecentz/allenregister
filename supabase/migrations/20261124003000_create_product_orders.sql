create table public.orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'cancelled', 'inventory_issue', 'refunded')),
  currency text not null default 'usd' check (currency = 'usd'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  title text not null,
  item_type text not null check (item_type = 'product'),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index orders_account_idx on public.orders (account_id, created_at desc);
create index order_items_order_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from anon, authenticated;
grant select, insert on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;

create policy "Customers can view their own orders"
on public.orders for select to authenticated
using ((select auth.uid()) = account_id or public.is_allens_lane_staff());

create policy "Customers can start their own pending orders"
on public.orders for insert to authenticated
with check ((select auth.uid()) = account_id and status = 'pending_payment');

create policy "Customers can view their own order items"
on public.order_items for select to authenticated
using (exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.account_id = (select auth.uid()) or public.is_allens_lane_staff())));

create policy "Customers can add items to their own pending orders"
on public.order_items for insert to authenticated
with check (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.account_id = (select auth.uid()) and orders.status = 'pending_payment'));

create or replace function public.complete_product_order_payment(
  checkout_order_id uuid,
  checkout_session_id text,
  payment_intent_id text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  line_item record;
begin
  if not exists (select 1 from public.orders where id = checkout_order_id and status = 'pending_payment' for update) then
    return 'already_processed';
  end if;

  for line_item in select catalog_item_id, quantity from public.order_items where order_id = checkout_order_id loop
    perform 1 from public.catalog_items
      where id = line_item.catalog_item_id
        and (inventory_quantity is null or inventory_quantity >= line_item.quantity)
      for update;
    if not found then
      update public.orders set status = 'inventory_issue', stripe_checkout_session_id = checkout_session_id, stripe_payment_intent_id = payment_intent_id, updated_at = now() where id = checkout_order_id;
      return 'inventory_issue';
    end if;
  end loop;

  for line_item in select catalog_item_id, quantity from public.order_items where order_id = checkout_order_id loop
    update public.catalog_items
      set inventory_quantity = inventory_quantity - line_item.quantity,
          updated_at = now()
      where id = line_item.catalog_item_id
        and (inventory_quantity is null or inventory_quantity >= line_item.quantity);
  end loop;

  update public.orders set status = 'paid', stripe_checkout_session_id = checkout_session_id, stripe_payment_intent_id = payment_intent_id, updated_at = now() where id = checkout_order_id;
  return 'paid';
end;
$$;

revoke all on function public.complete_product_order_payment(uuid, text, text) from public, anon, authenticated;
