-- Firebase Cloud Messaging tokens for the native (Flutter) app.
-- One row per court a device has enabled notifications for.
create table public.fcm_tokens (
  id          uuid        primary key default gen_random_uuid(),
  court_id    uuid        not null references public.courts(id) on delete cascade,
  user_id     text        not null,
  token       text        not null,
  platform    text        not null check (platform in ('android', 'ios')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (court_id, token)
);

create index fcm_tokens_token_idx on public.fcm_tokens (token);

-- App uses anonymous device UUIDs (no Supabase Auth), so the anon role gets
-- the same access as for the web-push `subscriptions` table.
alter table public.fcm_tokens enable row level security;

create policy "anon can read fcm_tokens"
  on public.fcm_tokens for select
  to anon using (true);

create policy "anon can insert fcm_tokens"
  on public.fcm_tokens for insert
  to anon with check (true);

create policy "anon can update fcm_tokens"
  on public.fcm_tokens for update
  to anon using (true) with check (true);

create policy "anon can delete fcm_tokens"
  on public.fcm_tokens for delete
  to anon using (true);
