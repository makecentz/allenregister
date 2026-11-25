update public.catalog_items
set short_description = 'For artistic families: covers two adults and up to five children in one household.',
    updated_at = now()
where slug = 'the-collective-membership';
