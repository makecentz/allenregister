alter table public.order_items
  drop constraint order_items_item_type_check;

alter table public.order_items
  add constraint order_items_item_type_check
  check (item_type in ('product', 'membership'));
