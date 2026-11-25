alter table public.ticket_orders drop constraint if exists ticket_orders_status_check;
alter table public.ticket_orders add constraint ticket_orders_status_check
  check (status in ('pending_payment', 'paid', 'inventory_issue', 'cancelled', 'refund_pending', 'refunded'));

create or replace function public.finalize_ticket_order_refund(p_ticket_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.ticket_orders%rowtype;
  tier record;
begin
  select * into order_row
  from public.ticket_orders
  where id = p_ticket_order_id
    and status in ('paid', 'refund_pending')
  for update;
  if not found then return 'not_refundable'; end if;

  if exists (
    select 1 from public.tickets
    where ticket_order_id = order_row.id and status = 'checked_in'
  ) then return 'checked_in'; end if;

  for tier in
    select ticket_type_id, count(*)::integer as quantity
    from public.tickets
    where ticket_order_id = order_row.id and status in ('issued', 'cancelled')
    group by ticket_type_id
  loop
    update public.ticket_types
    set capacity = capacity + tier.quantity, updated_at = now()
    where id = tier.ticket_type_id and capacity is not null;
  end loop;

  update public.tickets
  set status = 'refunded'
  where ticket_order_id = order_row.id and status in ('issued', 'cancelled');
  update public.ticket_orders
  set status = 'refunded', updated_at = now()
  where id = order_row.id;
  return 'refunded';
end;
$$;

revoke all on function public.finalize_ticket_order_refund(uuid) from public, anon, authenticated;
