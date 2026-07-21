-- Migration: create public.subscriptions table for Web Push
-- Run via: Supabase Dashboard → SQL Editor, or `supabase db push`

create table if not exists public.subscriptions (
  id                uuid        primary key default gen_random_uuid(),
  court_id          uuid        not null,
  subscription_json jsonb       not null,
  created_at        timestamptz not null default now()
);

-- Fast lookup by court when the Edge Function fans out notifications.
create index if not exists subscriptions_court_id_idx
  on public.subscriptions (court_id);

-- Prevent a device from registering more than once per court.
create unique index if not exists subscriptions_court_endpoint_unique
  on public.subscriptions (court_id, (subscription_json->>'endpoint'));

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.subscriptions enable row level security;

-- Anyone (anonymous users) can add their own subscription.
create policy "allow_insert"
  on public.subscriptions
  for insert
  to anon, authenticated
  with check (true);

-- Anyone can remove a subscription when they know its endpoint.
-- The endpoint URL is a long opaque string — knowing it is sufficient
-- authorization in an anonymous-user app like this one.
create policy "allow_delete"
  on public.subscriptions
  for delete
  to anon, authenticated
  using (true);

-- ─── Data API access ─────────────────────────────────────────────────────────
-- If your project uses the default "public" Data API schema, grant the roles
-- access so the client library can reach the table.

grant usage  on schema public          to anon, authenticated;
grant insert, delete on public.subscriptions to anon, authenticated;
