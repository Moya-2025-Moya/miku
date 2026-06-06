-- ScreenRead core schema
-- Relationship profiles, curated message archive, observed patterns, analysis history.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Relationship profiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null default 'demo-user',
  name            text not null,
  relationship_type text,
  source          text not null default 'native',
  context_notes   text,
  feelings        text,
  avatar_emoji    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_user_idx on profiles (user_id);

-- ---------------------------------------------------------------------------
-- Archived messages
-- ---------------------------------------------------------------------------
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  sender        text not null default 'them',
  body          text not null,
  sent_at       timestamptz,
  source        text not null default 'native',
  annotation    text,
  archived_at   timestamptz not null default now()
);

create index if not exists messages_profile_idx on messages (profile_id, archived_at desc);

-- ---------------------------------------------------------------------------
-- Observed communication patterns
-- ---------------------------------------------------------------------------
create table if not exists patterns (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  label          text not null,
  detail         text,
  evidence_count int not null default 1,
  confidence     text not null default 'low',
  first_observed timestamptz not null default now(),
  last_observed  timestamptz not null default now()
);

create index if not exists patterns_profile_idx on patterns (profile_id, last_observed desc);

-- ---------------------------------------------------------------------------
-- Analysis history
-- ---------------------------------------------------------------------------
create table if not exists analyses (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references profiles(id) on delete cascade,
  input_messages      jsonb not null,
  user_reaction       text,
  vibe_read           text,
  reality_check       text,
  response_options    jsonb,
  verdict             text,
  confidence          text,
  referenced_history  jsonb,
  language            text default 'en',
  created_at          timestamptz not null default now()
);

create index if not exists analyses_profile_idx on analyses (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();
