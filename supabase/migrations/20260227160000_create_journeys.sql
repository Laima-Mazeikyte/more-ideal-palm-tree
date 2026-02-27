create table public.journeys (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  slug       text        not null,
  sort_order integer     not null default 0,
  is_default boolean     not null default false,
  created_at timestamptz not null default now()
);

create unique index journeys_user_slug on public.journeys (user_id, slug);

alter table public.journeys enable row level security;

create policy "Users can manage own journeys"
  on public.journeys for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trigger: seed 5 default journeys for every new auth user (incl. anonymous)
create or replace function public.seed_default_journeys()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.journeys (user_id, name, slug, sort_order, is_default)
  values
    (new.id, 'Vitality',    'vitality',    1, true),
    (new.id, 'Pursuits',    'pursuits',    2, true),
    (new.id, 'Prosperity',  'prosperity',  3, true),
    (new.id, 'Connections', 'connections', 4, true),
    (new.id, 'Foundations', 'foundations', 5, true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_journeys();
