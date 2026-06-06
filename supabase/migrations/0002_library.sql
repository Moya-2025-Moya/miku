-- Relationship-library schema
-- Adds the "archive event" concept (a titled, dated, tagged group of messages
-- with a multi-field analysis) plus the profile-level decorations the library
-- UI needs (colour, initial, manual patterns/tensions, impression notes).

-- ---------------------------------------------------------------------------
-- Profile decorations used by the relationship library
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists color            text;
alter table profiles add column if not exists initial          text;
alter table profiles add column if not exists patterns         text[] not null default '{}';
alter table profiles add column if not exists tensions         text[] not null default '{}';
alter table profiles add column if not exists impression_who   text;
alter table profiles add column if not exists impression_behav text;
alter table profiles add column if not exists impression_feel  text;

-- ---------------------------------------------------------------------------
-- Archive events
-- One row = one "event card" in the library: a titled moment with its
-- messages and Miku's 3-step analysis. msgs/analysis are stored as JSON to
-- match the frontend shape 1:1 (msgs: [{who,text}], analysis: {happened,trigger,forward}).
-- ---------------------------------------------------------------------------
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  title       text not null default 'Untitled event',
  event_date  text,
  tags        text[] not null default '{}',
  msgs        jsonb not null default '[]'::jsonb,
  analysis    jsonb,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_profile_idx on events (profile_id, position asc);

drop trigger if exists events_set_updated_at on events;
create trigger events_set_updated_at
  before update on events
  for each row execute function set_updated_at();
