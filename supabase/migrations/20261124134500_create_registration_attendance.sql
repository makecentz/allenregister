create table public.registration_attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  attended_on date not null default current_date,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (registration_id, attended_on)
);

create index registration_attendance_date_idx on public.registration_attendance (attended_on, registration_id);

alter table public.registration_attendance enable row level security;
revoke all on public.registration_attendance from anon, authenticated;
grant select, insert, delete on public.registration_attendance to authenticated;

create policy "Staff can manage registration attendance"
on public.registration_attendance for all
to authenticated
using (public.is_allens_lane_staff())
with check (public.is_allens_lane_staff());
