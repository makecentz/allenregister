create table public.participants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'pending_payment', 'confirmed', 'cancelled', 'refunded')),
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, catalog_item_id, participant_id)
);

create index participants_account_idx on public.participants (account_id);
create index registrations_account_idx on public.registrations (account_id, created_at desc);
create index registrations_catalog_item_idx on public.registrations (catalog_item_id, status);

alter table public.participants enable row level security;
alter table public.registrations enable row level security;

revoke all on table public.participants, public.registrations from anon, authenticated;
grant select, insert, update, delete on table public.participants to authenticated;
grant select, insert on table public.registrations to authenticated;

create policy "Customers can manage their own participants"
on public.participants for all
to authenticated
using ((select auth.uid()) = account_id)
with check ((select auth.uid()) = account_id);

create policy "Customers can view their own registrations"
on public.registrations for select
to authenticated
using ((select auth.uid()) = account_id);

create policy "Customers can start their own registration drafts"
on public.registrations for insert
to authenticated
with check (
  (select auth.uid()) = account_id
  and status = 'draft'
  and exists (
    select 1 from public.participants
    where participants.id = registrations.participant_id
      and participants.account_id = (select auth.uid())
  )
  and exists (
    select 1 from public.catalog_items
    where catalog_items.id = registrations.catalog_item_id
      and catalog_items.status = 'published'
      and catalog_items.item_type in ('class', 'camp')
  )
);

create policy "Staff can view registration rosters"
on public.registrations for select
to authenticated
using (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
);
