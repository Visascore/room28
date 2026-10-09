create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.players (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
grant select, insert, update on public.players to authenticated;
grant all on public.players to service_role;
alter table public.players enable row level security;
create policy "own player read" on public.players for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "own player insert" on public.players for insert to authenticated with check (id = auth.uid());
create policy "own player update" on public.players for update to authenticated using (id = auth.uid());

create table public.lives (
  id text primary key,
  user_id uuid not null,
  label text not null,
  status text not null,
  born_city text not null,
  city_id text not null,
  age int not null default 0,
  career text,
  net_worth numeric not null default 0,
  countries int not null default 1,
  decisions int not null default 0,
  is_branch boolean not null default false,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lives_user_idx on public.lives(user_id);
grant select, insert, update, delete on public.lives to authenticated;
grant all on public.lives to service_role;
alter table public.lives enable row level security;
create policy "own lives read" on public.lives for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "own lives insert" on public.lives for insert to authenticated with check (user_id = auth.uid());
create policy "own lives update" on public.lives for update to authenticated using (user_id = auth.uid());
create policy "own lives delete" on public.lives for delete to authenticated using (user_id = auth.uid());