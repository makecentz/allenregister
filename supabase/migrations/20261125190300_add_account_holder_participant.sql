alter table public.participants
  add column is_account_holder boolean not null default false;

create unique index participants_one_account_holder_idx
  on public.participants (account_id)
  where is_account_holder;
