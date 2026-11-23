create policy "Staff can view participant details for rosters"
on public.participants for select
to authenticated
using (
  exists (
    select 1 from public.staff_roles
    where staff_roles.user_id = (select auth.uid())
  )
);
