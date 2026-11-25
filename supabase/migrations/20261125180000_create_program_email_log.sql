create table public.program_email_log (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid not null references auth.users(id) on delete restrict,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 5000),
  recipient_count integer not null check (recipient_count > 0),
  created_at timestamptz not null default now()
);

create index program_email_log_catalog_idx
  on public.program_email_log (catalog_item_id, created_at desc);

alter table public.program_email_log enable row level security;
revoke all on public.program_email_log from anon, authenticated;
grant select, insert on public.program_email_log to authenticated;

create policy "Staff can review program email delivery logs"
on public.program_email_log for select to authenticated
using (public.is_allens_lane_staff());

create policy "Staff can log program emails they send"
on public.program_email_log for insert to authenticated
with check (
  public.is_allens_lane_staff()
  and sent_by = (select auth.uid())
);
