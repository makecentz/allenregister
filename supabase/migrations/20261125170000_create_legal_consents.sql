create table public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  document text not null check (document in ('camp_waiver')),
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (account_id, participant_id, catalog_item_id, document, version)
);

create index legal_consents_account_idx
  on public.legal_consents (account_id, accepted_at desc);

alter table public.legal_consents enable row level security;
revoke all on public.legal_consents from anon, authenticated;
grant select, insert on public.legal_consents to authenticated;

create policy "Customers can view their own legal consents"
on public.legal_consents for select to authenticated
using ((select auth.uid()) = account_id or public.is_allens_lane_staff());

create policy "Customers can accept the camp waiver for their participant"
on public.legal_consents for insert to authenticated
with check (
  (select auth.uid()) = account_id
  and document = 'camp_waiver'
  and exists (
    select 1
    from public.participants
    where participants.id = legal_consents.participant_id
      and participants.account_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.catalog_items
    where catalog_items.id = legal_consents.catalog_item_id
      and catalog_items.status = 'published'
      and catalog_items.item_type = 'camp'
  )
);
