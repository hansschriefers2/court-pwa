-- Recurring training templates (one per weekday, repeated weekly)
create table public.trainings (
  id                  uuid        primary key default gen_random_uuid(),
  court_id            uuid        not null references public.courts(id) on delete cascade,
  created_by_user_id  text        not null,
  created_by_username text        not null,
  label               text        not null default 'Training',
  day_of_week         smallint    not null check (day_of_week between 0 and 6),
  start_min           integer     not null,
  end_min             integer     not null,
  created_at          timestamptz not null default now()
);

-- App uses anonymous device UUIDs (no Supabase Auth), so grant full access to the anon role.
alter table public.trainings enable row level security;

create policy "anon can read trainings"
  on public.trainings for select
  to anon using (true);

create policy "anon can insert trainings"
  on public.trainings for insert
  to anon with check (true);

create policy "anon can delete trainings"
  on public.trainings for delete
  to anon using (true);

-- Link response slots back to the training that prompted them
alter table public.slots
  add column if not exists training_id uuid references public.trainings(id) on delete set null;
