alter table public.slots
  add column tentative boolean not null default false;
