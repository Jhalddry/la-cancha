-- ============================================================
-- matches + match_players tables
-- ============================================================

create table if not exists matches (
  id               uuid          primary key default gen_random_uuid(),
  sport            text          not null,
  modality         text          not null,
  type             text          not null check (type in ('chill', 'seria', 'competencia')),
  skill_level      smallint      not null check (skill_level between 1 and 5),
  missing_positions text[]       not null default '{}',
  missing_count    smallint      not null default 0 check (missing_count >= 0),
  location_name    text          not null check (char_length(location_name) between 1 and 200),
  location_address text          check (location_address is null or char_length(location_address) <= 400),
  location_lat     double precision,
  location_lng     double precision,
  starts_at        timestamptz   not null,
  duration_min     smallint      not null check (duration_min > 0),
  price_per_hour   numeric(10,2) not null check (price_per_hour >= 0),
  currency         text          not null check (currency in ('USD', 'VES')),
  payment_methods  text[]        not null default '{}',
  requirements     text[]        not null default '{}',
  organizer_id     uuid          not null references profiles(id) on delete cascade,
  created_at       timestamptz   not null default now()
);

create index if not exists matches_organizer_id_idx on matches(organizer_id);
create index if not exists matches_starts_at_idx    on matches(starts_at);
create index if not exists matches_sport_idx         on matches(sport);

alter table matches enable row level security;

drop policy if exists "matches: authenticated read" on matches;
drop policy if exists "matches: organizer insert"   on matches;
drop policy if exists "matches: organizer update"   on matches;
drop policy if exists "matches: organizer delete"   on matches;

create policy "matches: authenticated read"
  on matches for select to authenticated using (true);

create policy "matches: organizer insert"
  on matches for insert to authenticated
  with check (auth.uid() = organizer_id);

create policy "matches: organizer update"
  on matches for update to authenticated
  using (auth.uid() = organizer_id);

create policy "matches: organizer delete"
  on matches for delete to authenticated
  using (auth.uid() = organizer_id);

-- ============================================================

create table if not exists match_players (
  match_id  uuid        not null references matches(id)  on delete cascade,
  player_id uuid        not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index if not exists match_players_player_id_idx on match_players(player_id);

alter table match_players enable row level security;

drop policy if exists "match_players: authenticated read" on match_players;
drop policy if exists "match_players: own insert"         on match_players;
drop policy if exists "match_players: own delete"         on match_players;

create policy "match_players: authenticated read"
  on match_players for select to authenticated using (true);

create policy "match_players: own insert"
  on match_players for insert to authenticated
  with check (auth.uid() = player_id);

create policy "match_players: own delete"
  on match_players for delete to authenticated
  using (auth.uid() = player_id);

-- ============================================================
-- Helper RPCs for missing_count (best-effort, clamped to 0)
-- ============================================================

create or replace function decrement_missing_count(match_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.matches
  set missing_count = greatest(0, missing_count - 1)
  where id = match_id;
$$;

create or replace function increment_missing_count(match_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.matches
  set missing_count = missing_count + 1
  where id = match_id;
$$;

revoke execute on function decrement_missing_count(uuid) from public;
revoke execute on function increment_missing_count(uuid) from public;
grant execute on function decrement_missing_count(uuid) to authenticated;
grant execute on function increment_missing_count(uuid) to authenticated;
