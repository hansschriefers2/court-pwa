-- Enable Realtime for the trainings table (was missing, causing live updates to never arrive)
alter publication supabase_realtime add table public.trainings;

-- Allow anon role to update training rows (edit was silently blocked by RLS)
create policy "anon can update trainings"
  on public.trainings for update
  to anon using (true) with check (true);

