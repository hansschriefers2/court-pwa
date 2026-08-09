-- Replace boolean `tentative` with a text `status` column.
alter table public.slots
  add column status text not null default 'accepted';

-- Migrate existing data
update public.slots set status = 'tentative' where tentative = true;

alter table public.slots
  drop column tentative;

-- Constrain allowed values
alter table public.slots
  add constraint slots_status_check check (status in ('accepted', 'tentative', 'declined'));
