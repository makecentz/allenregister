create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete restrict,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (order_id, catalog_item_id)
);

create index memberships_account_expiry_idx
  on public.memberships (account_id, expires_at desc);
create index memberships_catalog_expiry_idx
  on public.memberships (catalog_item_id, expires_at desc);

alter table public.memberships enable row level security;
revoke all on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;

create policy "Customers can view their own memberships"
on public.memberships for select to authenticated
using ((select auth.uid()) = account_id or public.is_allens_lane_staff());

create or replace function public.activate_memberships_for_order(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
begin
  select * into order_row
  from public.orders
  where id = p_order_id and status = 'paid'
  for update;
  if not found then return 'not_paid'; end if;

  insert into public.memberships (
    account_id,
    catalog_item_id,
    order_id,
    starts_at,
    expires_at
  )
  select
    order_row.account_id,
    order_items.catalog_item_id,
    order_row.id,
    order_row.created_at,
    order_row.created_at + interval '1 year'
  from public.order_items
  where order_items.order_id = order_row.id
    and order_items.item_type = 'membership'
  on conflict (order_id, catalog_item_id) do nothing;

  return 'activated';
end;
$$;

revoke all on function public.activate_memberships_for_order(uuid) from public, anon, authenticated;

insert into public.memberships (
  account_id,
  catalog_item_id,
  order_id,
  starts_at,
  expires_at
)
select
  orders.account_id,
  order_items.catalog_item_id,
  orders.id,
  orders.created_at,
  orders.created_at + interval '1 year'
from public.orders
join public.order_items on order_items.order_id = orders.id
where orders.status = 'paid'
  and order_items.item_type = 'membership'
on conflict (order_id, catalog_item_id) do nothing;
