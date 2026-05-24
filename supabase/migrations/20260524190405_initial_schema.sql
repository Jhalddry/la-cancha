-- ============================================================
-- La Cancha — Initial Schema
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

create type sport as enum (
  'futbol', 'basket', 'tenis', 'padel', 'beachTennis'
);

create type modality as enum (
  'futbol5', 'futbol7', 'futbol11',
  'basket3v3', 'basket5v5',
  'tenisSingles', 'tenisDobles',
  'padelDobles',
  'beachDobles', 'beachSimples'
);

create type match_type as enum ('chill', 'seria', 'competencia');

create type player_position as enum (
  'portero', 'defensa', 'lateral', 'mediocampo', 'extremo', 'delantero',
  'base', 'escolta', 'alero', 'aleroPivot', 'pivot',
  'cualquiera'
);

create type payment_method as enum (
  'pagoMovil', 'transferencia', 'efectivo', 'zelle', 'usdt'
);

create type currency as enum ('USD', 'VES');

create type participant_status as enum ('joined', 'left', 'kicked');

-- ------------------------------------------------------------
-- PROFILES  (mirrors auth.users 1:1)
-- ------------------------------------------------------------

create table profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  name            text not null,
  username        text unique,
  avatar_url      text,
  skill_level     smallint not null default 1 check (skill_level between 1 and 5),
  sports          sport[]          not null default '{}',
  positions       player_position[]       not null default '{}',
  bio             text,
  verified        boolean          not null default false,
  reputation      numeric(3, 1)    check (reputation between 1.0 and 5.0),
  matches_played      int not null default 0,
  matches_organized   int not null default 0,
  attendance_pct      smallint check (attendance_pct between 0 and 100),
  badges          text[]           not null default '{}',
  created_at      timestamptz      not null default now(),
  updated_at      timestamptz      not null default now()
);

alter table profiles enable row level security;

create policy "profiles: public read"
  on profiles for select using (true);

create policy "profiles: owner update"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- ------------------------------------------------------------
-- VENUES
-- ------------------------------------------------------------

create table venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  lat         double precision,
  lng         double precision,
  sports      sport[] not null default '{}',
  created_at  timestamptz not null default now()
);

alter table venues enable row level security;

create policy "venues: public read"
  on venues for select using (true);

-- ------------------------------------------------------------
-- MATCHES
-- ------------------------------------------------------------

create table matches (
  id                uuid primary key default gen_random_uuid(),
  organizer_id      uuid not null references profiles (id) on delete cascade,
  sport             sport        not null,
  modality          modality     not null,
  type              match_type   not null,
  skill_level       smallint     not null check (skill_level between 1 and 5),
  missing_positions player_position[]   not null default '{}',
  missing_count     int          not null default 0,
  location_name     text         not null,
  location_address  text,
  venue_id          uuid references venues (id) on delete set null,
  lat               double precision,
  lng               double precision,
  starts_at         timestamptz  not null,
  duration_min      int          not null check (duration_min > 0),
  price_per_hour    numeric(10, 2) not null default 0,
  currency          currency     not null default 'USD',
  payment_methods   payment_method[] not null default '{}',
  requirements      text[]       not null default '{}',
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),
  deleted_at        timestamptz
);

alter table matches enable row level security;

create policy "matches: public read"
  on matches for select using (deleted_at is null);

create policy "matches: organizer insert"
  on matches for insert with check (auth.uid() = organizer_id);

create policy "matches: organizer update"
  on matches for update using (auth.uid() = organizer_id);

create policy "matches: organizer delete"
  on matches for delete using (auth.uid() = organizer_id);

create trigger matches_updated_at
  before update on matches
  for each row execute procedure set_updated_at();

-- ------------------------------------------------------------
-- MATCH PARTICIPANTS
-- ------------------------------------------------------------

create table match_participants (
  match_id        uuid not null references matches (id) on delete cascade,
  profile_id      uuid not null references profiles (id) on delete cascade,
  status          participant_status not null default 'joined',
  payment_method  payment_method,
  joined_at       timestamptz not null default now(),
  primary key (match_id, profile_id)
);

alter table match_participants enable row level security;

create policy "participants: public read"
  on match_participants for select using (true);

create policy "participants: self insert"
  on match_participants for insert with check (auth.uid() = profile_id);

create policy "participants: self update"
  on match_participants for update using (auth.uid() = profile_id);

-- Recompute missing_count when participants change
create or replace function sync_missing_count()
returns trigger language plpgsql as $$
declare
  total_slots int;
  joined_count int;
begin
  select cardinality(missing_positions) into total_slots
  from matches where id = coalesce(new.match_id, old.match_id);

  select count(*) into joined_count
  from match_participants
  where match_id = coalesce(new.match_id, old.match_id)
    and status = 'joined';

  update matches
  set missing_count = greatest(0, total_slots - joined_count)
  where id = coalesce(new.match_id, old.match_id);

  return coalesce(new, old);
end;
$$;

create trigger participants_sync_missing_count
  after insert or update or delete on match_participants
  for each row execute procedure sync_missing_count();

-- ------------------------------------------------------------
-- CHAT THREADS  (1:1 with matches)
-- ------------------------------------------------------------

create table chat_threads (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null unique references matches (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table chat_threads enable row level security;

create policy "threads: participant read"
  on chat_threads for select using (
    exists (
      select 1 from match_participants mp
      where mp.match_id = chat_threads.match_id
        and mp.profile_id = auth.uid()
        and mp.status = 'joined'
    )
    or exists (
      select 1 from matches m
      where m.id = chat_threads.match_id
        and m.organizer_id = auth.uid()
    )
  );

create or replace function create_chat_thread_for_match()
returns trigger language plpgsql as $$
begin
  insert into chat_threads (match_id) values (new.id);
  return new;
end;
$$;

create trigger match_create_chat_thread
  after insert on matches
  for each row execute procedure create_chat_thread_for_match();

create trigger chat_threads_updated_at
  before update on chat_threads
  for each row execute procedure set_updated_at();

-- ------------------------------------------------------------
-- CHAT MESSAGES
-- ------------------------------------------------------------

create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references chat_threads (id) on delete cascade,
  author_id   uuid not null references profiles (id) on delete cascade,
  body        text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  sent_at     timestamptz not null default now()
);

alter table chat_messages enable row level security;

create policy "messages: participant read"
  on chat_messages for select using (
    exists (
      select 1 from chat_threads ct
      join match_participants mp on mp.match_id = ct.match_id
      where ct.id = chat_messages.thread_id
        and mp.profile_id = auth.uid()
        and mp.status = 'joined'
    )
    or exists (
      select 1 from chat_threads ct
      join matches m on m.id = ct.match_id
      where ct.id = chat_messages.thread_id
        and m.organizer_id = auth.uid()
    )
  );

create policy "messages: participant insert"
  on chat_messages for insert with check (
    auth.uid() = author_id
    and (
      exists (
        select 1 from chat_threads ct
        join match_participants mp on mp.match_id = ct.match_id
        where ct.id = thread_id
          and mp.profile_id = auth.uid()
          and mp.status = 'joined'
      )
      or exists (
        select 1 from chat_threads ct
        join matches m on m.id = ct.match_id
        where ct.id = thread_id
          and m.organizer_id = auth.uid()
      )
    )
  );

create or replace function bump_thread_updated_at()
returns trigger language plpgsql as $$
begin
  update chat_threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$;

create trigger message_bump_thread
  after insert on chat_messages
  for each row execute procedure bump_thread_updated_at();

-- ------------------------------------------------------------
-- CHAT READS
-- ------------------------------------------------------------

create table chat_reads (
  thread_id       uuid not null references chat_threads (id) on delete cascade,
  profile_id      uuid not null references profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (thread_id, profile_id)
);

alter table chat_reads enable row level security;

create policy "reads: self read"
  on chat_reads for select using (auth.uid() = profile_id);

create policy "reads: self upsert"
  on chat_reads for insert with check (auth.uid() = profile_id);

create policy "reads: self update"
  on chat_reads for update using (auth.uid() = profile_id);

-- ------------------------------------------------------------
-- RATINGS
-- ------------------------------------------------------------

create table ratings (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches (id) on delete cascade,
  rater_id    uuid not null references profiles (id) on delete cascade,
  ratee_id    uuid not null references profiles (id) on delete cascade,
  stars       smallint not null check (stars between 1 and 5),
  tags        text[] not null default '{}',
  comment     text check (char_length(comment) <= 500),
  created_at  timestamptz not null default now(),
  unique (match_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);

alter table ratings enable row level security;

create policy "ratings: public read"
  on ratings for select using (true);

create policy "ratings: participant insert"
  on ratings for insert with check (
    auth.uid() = rater_id
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.starts_at < now()
    )
    and (
      exists (
        select 1 from match_participants mp
        where mp.match_id = ratings.match_id
          and mp.profile_id = auth.uid()
          and mp.status = 'joined'
      )
      or exists (
        select 1 from matches m
        where m.id = match_id and m.organizer_id = auth.uid()
      )
    )
  );

create or replace function sync_reputation()
returns trigger language plpgsql as $$
begin
  update profiles
  set reputation = (
    select round(avg(stars)::numeric, 1)
    from ratings
    where ratee_id = new.ratee_id
  )
  where id = new.ratee_id;
  return new;
end;
$$;

create trigger rating_sync_reputation
  after insert on ratings
  for each row execute procedure sync_reputation();

-- ------------------------------------------------------------
-- EXCHANGE RATE
-- ------------------------------------------------------------

create table exchange_rate (
  id          uuid primary key default gen_random_uuid(),
  source      text not null default 'bcv',
  rate        numeric(12, 4) not null,
  fetched_at  timestamptz not null default now()
);

alter table exchange_rate enable row level security;

create policy "exchange_rate: public read"
  on exchange_rate for select using (true);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles (id) on delete cascade,
  kind        text not null,
  payload     jsonb not null default '{}',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications: owner read"
  on notifications for select using (auth.uid() = profile_id);

create policy "notifications: owner update"
  on notifications for update using (auth.uid() = profile_id);
