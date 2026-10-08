create type article_visibility as enum ('public', 'members', 'author');
create type article_status as enum ('draft', 'published', 'hidden', 'deleted');
create type comment_status as enum ('visible', 'deleted', 'hidden');
create type reaction_target_type as enum ('article', 'comment');
create type reaction_kind as enum ('laugh', 'heart', 'thumb', 'fire');

create table articles_copy (
  article_id uuid primary key,
  author_id uuid not null,
  title text not null,
  slug text not null,
  visibility article_visibility not null,
  status article_status not null,
  comments_enabled boolean not null,
  published_at timestamptz
);

create table users_copy (
  user_id uuid primary key,
  display_name text,
  avatar_url text,
  is_restricted boolean not null default false
);

create table comments (
  id uuid primary key,
  article_id uuid not null,
  author_id uuid not null,
  parent_id uuid,
  body varchar(5000) not null default '',
  status comment_status not null default 'visible',
  edited_at timestamptz,
  reaction_count integer not null default 0,
  reply_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index comments_article_idx on comments (article_id, created_at);
create index comments_parent_idx on comments (parent_id);

create table reactions (
  user_id uuid not null,
  target_type reaction_target_type not null,
  target_id uuid not null,
  kind reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index reactions_target_idx on reactions (target_type, target_id);

create table views (
  article_id uuid not null,
  viewer_key text not null,
  counted_at timestamptz not null default now(),
  primary key (article_id, viewer_key)
);

create table feed_seen (
  viewer_key text not null,
  feed_key text not null,
  article_id uuid not null,
  seen_at timestamptz not null default now(),
  primary key (viewer_key, feed_key, article_id)
);

create table bookmarks (
  user_id uuid not null,
  article_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);
create index bookmarks_user_idx on bookmarks (user_id, created_at);

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
