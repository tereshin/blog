create type user_role as enum ('member', 'admin', 'superadmin');
create type appearance as enum ('light', 'dark');

create table users (
  id uuid primary key,
  public_number serial not null unique,
  -- пусто только у суперадминистратора, созданного bootstrap-prod, до его первого входа
  google_sub text unique,
  email text not null,
  role user_role not null default 'member',
  can_publish boolean not null default true,
  restricted_at timestamptz,
  appearance appearance,
  created_at timestamptz not null default now()
);
create unique index users_email_lower_idx on users (lower(email));

create table sessions (
  id text primary key,
  user_id uuid not null references users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index sessions_user_idx on sessions (user_id);

create table settings_copy (
  id smallint primary key default 1 check (id = 1),
  registration_open boolean not null default true,
  new_members_can_publish boolean not null default true
);

create table outbox (
  id uuid primary key,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index outbox_unpublished_idx on outbox (created_at, id) where published_at is null;

create table processed_events (
  event_id uuid not null,
  consumer text not null,
  processed_at timestamptz not null default now(),
  primary key (consumer, event_id)
);

create table seed_runs (
  profile text primary key check (profile in ('small', 'large')),
  anchor_at timestamptz not null,
  started_at timestamptz not null,
  finished_at timestamptz
);
