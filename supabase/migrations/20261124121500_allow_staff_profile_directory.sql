create policy "Staff can view customer profiles"
on public.profiles for select
to authenticated
using (public.is_allens_lane_staff());
