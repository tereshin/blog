create type notification_kind as enum ('comment', 'reply', 'reaction', 'message', 'moderation');

create table articles_copy (
  article_id uuid primary key,
  author_id uuid not null,
  title text not null,
  slug text not null
);

create table users_copy (
  user_id uuid primary key,
  display_name text,
  avatar_url text
);

create table notifications (
  id uuid primary key,
  user_id uuid not null,
  kind notification_kind not null,
  article_id uuid,
  comment_id uuid,
  conversation_id uuid,
  actor_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc, id desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

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
