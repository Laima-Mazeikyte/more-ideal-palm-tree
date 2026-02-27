-- Seed journeys for any users who existed before the trigger was added
-- (dev user, any anonymous sessions already in auth.users, etc.)
insert into public.journeys (user_id, name, slug, sort_order, is_default)
select
  u.id,
  j.name,
  j.slug,
  j.sort_order,
  true
from auth.users u
cross join (values
  ('Vitality',    'vitality',    1),
  ('Pursuits',    'pursuits',    2),
  ('Prosperity',  'prosperity',  3),
  ('Connections', 'connections', 4),
  ('Foundations', 'foundations', 5)
) as j(name, slug, sort_order)
-- Skip any user that already has journeys (idempotent)
where not exists (
  select 1 from public.journeys where user_id = u.id
);

-- Migrate existing todos → steps, assigning each to the user's Foundations journey.
-- Foundations (home, chores, obligations, logistics) is the closest semantic fit
-- for the general "things to do today" mental model of the original flat todo list.
do $$
declare
  r record;
begin
  for r in
    select t.id, t.user_id, t.text, t.completed, t.created_at,
           j.id as journey_id
    from   public.todos t
    join   public.journeys j on j.user_id = t.user_id and j.slug = 'foundations'
    where  t.user_id is not null
  loop
    insert into public.steps (id, user_id, journey_id, text, completed, created_at)
    values (r.id, r.user_id, r.journey_id, r.text, r.completed, r.created_at)
    on conflict (id) do nothing;
  end loop;
end;
$$;

-- Drop todos table — clean break. App is in early development with minimal data.
drop table public.todos;

-- Update the claim RPC to migrate steps (and milestones) instead of todos.
-- Journeys must be transferred first since steps have a FK dependency on them.
-- Function name is preserved so auth.js requires no changes.
create or replace function public.claim_anonymous_todos(anon_user_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() = anon_user_id then return; end if;

  -- Transfer journeys first (steps.journey_id FKs to journeys)
  update public.journeys   set user_id = auth.uid() where user_id = anon_user_id;
  update public.milestones set user_id = auth.uid() where user_id = anon_user_id;
  update public.steps      set user_id = auth.uid() where user_id = anon_user_id;
end;
$$;
