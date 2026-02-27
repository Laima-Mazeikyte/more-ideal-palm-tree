-- Milestones (Phase 2 UI — schema only)
create table public.milestones (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  journey_id uuid        not null references public.journeys(id) on delete cascade,
  name       text        not null,
  sort_order integer     not null default 0,
  created_at timestamptz not null default now()
);

alter table public.milestones enable row level security;

create policy "Users can manage own milestones"
  on public.milestones for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Paths (Phase 2 UI — schema only)
create table public.paths (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table public.paths enable row level security;

create policy "Users can manage own paths"
  on public.paths for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Steps (replaces todos — atomic unit of work)
create table public.steps (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  journey_id   uuid        not null references public.journeys(id),
  milestone_id uuid        references public.milestones(id) on delete set null,
  text         text        not null,
  completed    boolean     not null default false,
  created_at   timestamptz not null default now()
);

create index steps_user_created on public.steps (user_id, created_at);
create index steps_journey      on public.steps (journey_id);

alter table public.steps enable row level security;

create policy "Users can manage own steps"
  on public.steps for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
