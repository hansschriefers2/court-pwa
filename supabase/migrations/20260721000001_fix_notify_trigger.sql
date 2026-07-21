-- Fix: recreate call_notify_new_slot for pg_net ≥ 0.8
-- pg_net changed net.http_post's body parameter from `text` → `jsonb`.
-- This migration drops the broken function/trigger and recreates them.
--
-- Before running this migration, store your service-role key in the Vault once:
--   select vault.create_secret('<your-service-role-key>', 'service_role_key');
-- (Dashboard → SQL Editor)

drop trigger if exists on_slot_inserted on public.slots;
drop trigger if exists on_slot_insert on public.slots;
drop function if exists public.call_notify_new_slot() cascade;

create or replace function public.call_notify_new_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _service_role_key text;
begin
  select decrypted_secret
    into _service_role_key
    from vault.decrypted_secrets
   where name = 'service_role_key'
   limit 1;

  perform net.http_post(
    url     := 'https://jivtfasldrjntzoenurj.supabase.co/functions/v1/notify-new-slot'::text,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    ),
    body    := to_jsonb(new)
  );
  return new;
end;
$$;

create trigger on_slot_inserted
  after insert on public.slots
  for each row execute procedure public.call_notify_new_slot();
