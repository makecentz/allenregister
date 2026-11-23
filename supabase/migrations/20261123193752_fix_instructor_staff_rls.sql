create or replace function public.is_allens_lane_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff_roles where user_id = auth.uid());
$$;

revoke all on function public.is_allens_lane_staff() from public;
grant execute on function public.is_allens_lane_staff() to anon, authenticated;

drop policy "Published instructors are public" on public.instructors;
drop policy "Staff manage instructors" on public.instructors;

create policy "Published instructors are public"
on public.instructors for select
using (status = 'published' or (select public.is_allens_lane_staff()));

create policy "Staff manage instructors"
on public.instructors for all to authenticated
using ((select public.is_allens_lane_staff()))
with check ((select public.is_allens_lane_staff()));
