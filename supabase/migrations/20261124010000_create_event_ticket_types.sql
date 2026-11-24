create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_session_id uuid not null references public.catalog_sessions(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ticket_types_session_idx on public.ticket_types (event_session_id, sort_order);

alter table public.ticket_types enable row level security;
revoke all on public.ticket_types from anon, authenticated;
grant select, insert, update, delete on public.ticket_types to authenticated;
grant select on public.ticket_types to anon;

create policy "Anyone can view ticket types for published events"
on public.ticket_types for select to anon, authenticated
using (is_active and exists (
  select 1 from public.catalog_sessions
  join public.catalog_items on catalog_items.id = catalog_sessions.catalog_item_id
  where catalog_sessions.id = ticket_types.event_session_id
    and catalog_items.item_type = 'event'
    and catalog_items.status = 'published'
));

create policy "Staff can manage ticket types"
on public.ticket_types for all to authenticated
using (public.is_allens_lane_staff())
with check (public.is_allens_lane_staff());
