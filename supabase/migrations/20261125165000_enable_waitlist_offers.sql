create or replace function public.reserve_registration_for_payment(p_registration_id uuid)
returns table (registration_id uuid, price_cents integer, title text, checkout_session_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  registration_row public.registrations%rowtype;
  item_row public.catalog_items%rowtype;
  occupied_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in is required to complete registration.';
  end if;

  select * into registration_row
  from public.registrations
  where id = p_registration_id and account_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Registration was not found.';
  end if;
  if registration_row.status = 'confirmed' then
    raise exception 'This registration has already been confirmed.';
  end if;
  if registration_row.status = 'pending_payment'
    and registration_row.checkout_expires_at > now()
    and registration_row.stripe_checkout_session_id is not null then
    return query select registration_row.id, registration_row.price_cents, ''::text, registration_row.stripe_checkout_session_id;
    return;
  end if;

  select * into item_row
  from public.catalog_items
  where id = registration_row.catalog_item_id
    and status = 'published'
    and item_type in ('class', 'camp')
  for update;
  if not found then
    raise exception 'This offering is no longer available.';
  end if;
  if coalesce(item_row.metadata->>'availability', 'open') = 'waitlist'
    and not exists (
      select 1 from public.waitlist_entries
      where catalog_item_id = registration_row.catalog_item_id
        and account_id = registration_row.account_id
        and participant_id = registration_row.participant_id
        and status = 'offered'
    ) then
    raise exception 'This offering is currently available by waitlist only.';
  end if;

  select count(*)::integer into occupied_count
  from public.registrations
  where catalog_item_id = item_row.id
    and (status = 'confirmed' or (status = 'pending_payment' and checkout_expires_at > now()))
    and id <> registration_row.id;
  if item_row.capacity is not null and occupied_count >= item_row.capacity then
    raise exception 'This offering has reached capacity. Please join the waitlist.';
  end if;

  update public.registrations
  set status = 'pending_payment',
      checkout_expires_at = now() + interval '30 minutes',
      stripe_checkout_session_id = null,
      updated_at = now()
  where id = registration_row.id;
  return query select registration_row.id, registration_row.price_cents, item_row.title, null::text;
end;
$$;
