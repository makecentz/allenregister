grant select on public.gift_certificate_redemptions to authenticated;

create policy "Staff can view gift certificate redemptions"
on public.gift_certificate_redemptions for select to authenticated
using (public.is_allens_lane_staff());
