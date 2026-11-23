create table public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.staff_roles enable row level security;

revoke all on table public.staff_roles from anon, authenticated;
grant select on table public.staff_roles to authenticated;

create policy "Staff can view their own role"
on public.staff_roles for select
to authenticated
using ((select auth.uid()) = user_id);

grant insert, update, delete on table public.catalog_items, public.catalog_sessions, public.donation_funds to authenticated;

create policy "Staff can manage catalog items"
on public.catalog_items for all
to authenticated
using (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
);

create policy "Staff can manage catalog sessions"
on public.catalog_sessions for all
to authenticated
using (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
);

create policy "Staff can manage donation funds"
on public.donation_funds for all
to authenticated
using (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
);
