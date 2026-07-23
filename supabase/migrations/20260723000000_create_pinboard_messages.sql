-- Migration: create public.pinboard_messages table
-- Apply via: Supabase Dashboard → SQL Editor, or `supabase db push`

create table if not exists public.pinboard_messages (
  id         uuid        primary key default gen_random_uuid(),
  court_id   uuid        not null,
  user_id    text        not null,
  username   text        not null,
  message    text        not null check (char_length(message) between 1 and 200),
  created_at timestamptz not null default now()
);

-- Fast lookup by court
create index if not exists pinboard_messages_court_id_idx
  on public.pinboard_messages (court_id, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.pinboard_messages enable row level security;

-- Anyone can read messages
create policy "pinboard_allow_select"
  on public.pinboard_messages
  for select
  to anon, authenticated
  using (true);

-- Anyone can post a message
create policy "pinboard_allow_insert"
  on public.pinboard_messages
  for insert
  to anon, authenticated
  with check (true);

-- Anyone can remove any message (community moderation)
create policy "pinboard_allow_delete"
  on public.pinboard_messages
  for delete
  to anon, authenticated
  using (true);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime for live updates
alter publication supabase_realtime add table public.pinboard_messages;
