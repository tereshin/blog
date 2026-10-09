create table users_copy (
  user_id uuid primary key,
  display_name text,
  avatar_url text,
  slug text,
  is_restricted boolean not null default false
);

create table conversations (
  id uuid primary key,
  user_low_id uuid not null,
  user_high_id uuid not null,
  last_message_at timestamptz,
  unique (user_low_id, user_high_id),
  check (user_low_id < user_high_id)
);
create index conversations_low_idx on conversations (user_low_id, last_message_at desc, id desc);
create index conversations_high_idx on conversations (user_high_id, last_message_at desc, id desc);

create table messages (
  id uuid primary key,
  conversation_id uuid not null references conversations (id),
  sender_id uuid not null,
  body varchar(4000) not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (char_length(body) between 1 and 4000)
);
create index messages_conversation_idx on messages (conversation_id, created_at desc, id desc);

create table idempotency_keys (
  user_id uuid not null,
  key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
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
