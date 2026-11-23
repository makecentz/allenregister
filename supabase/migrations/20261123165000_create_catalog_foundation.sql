create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('class', 'camp', 'event', 'product', 'membership')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  slug text not null unique,
  title text not null,
  short_description text,
  description text,
  audience text,
  starts_on date,
  ends_on date,
  location text,
  capacity integer check (capacity is null or capacity > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  inventory_quantity integer check (inventory_quantity is null or inventory_quantity >= 0),
  image_path text,
  sort_order integer not null default 0,
  requires_registration boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_sessions (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  location text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.donation_funds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_items_public_browse_idx
  on public.catalog_items (item_type, starts_on, sort_order)
  where status = 'published';

create index catalog_sessions_public_browse_idx
  on public.catalog_sessions (catalog_item_id, starts_at);

alter table public.catalog_items enable row level security;
alter table public.catalog_sessions enable row level security;
alter table public.donation_funds enable row level security;

revoke all on table public.catalog_items, public.catalog_sessions, public.donation_funds from anon, authenticated;
grant select on table public.catalog_items, public.catalog_sessions, public.donation_funds to anon, authenticated;

create policy "Anyone can view published catalog items"
on public.catalog_items for select
to anon, authenticated
using (status = 'published');

create policy "Anyone can view sessions for published catalog items"
on public.catalog_sessions for select
to anon, authenticated
using (
  exists (
    select 1
    from public.catalog_items
    where catalog_items.id = catalog_sessions.catalog_item_id
      and catalog_items.status = 'published'
  )
);

create policy "Anyone can view active donation funds"
on public.donation_funds for select
to anon, authenticated
using (is_active = true);
