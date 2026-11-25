insert into public.catalog_items (
  item_type,
  status,
  slug,
  title,
  short_description,
  description,
  audience,
  price_cents,
  sort_order,
  requires_registration,
  published_at
)
values
  (
    'membership',
    'published',
    'the-maker-membership',
    'The Maker',
    'For an individual who wants to make, learn, and help sustain creative experiences in the community.',
    'For the individual who chooses artistic experiences for themselves, or who believes in paying it forward for another maker in the community. This individual membership applies to one single adult and lasts one full year from purchase.',
    'Individual',
    5500,
    10,
    false,
    now()
  ),
  (
    'membership',
    'published',
    'the-collective-membership',
    'The Collective',
    'For artistic families: covers two adults and up to five children in one household.',
    'For artistic families who enjoy arts experiences together, or for someone who believes in the good of the creative collective and its benefits for our community. A Family membership covers two adults and up to five children in one household and lasts one full calendar year from purchase.',
    'Family',
    9500,
    20,
    false,
    now()
  )
on conflict (slug) do nothing;
