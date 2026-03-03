-- Add default auth.uid() to user_id columns so inserts work without
-- the client explicitly providing user_id. RLS still enforces ownership.

alter table public.steps
  alter column user_id set default auth.uid();

alter table public.journeys
  alter column user_id set default auth.uid();

alter table public.milestones
  alter column user_id set default auth.uid();

alter table public.paths
  alter column user_id set default auth.uid();
