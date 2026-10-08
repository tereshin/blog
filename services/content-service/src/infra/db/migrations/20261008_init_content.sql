create extension if not exists pg_trgm;

create type user_role as enum ('member', 'admin', 'superadmin');
create type slug_owner_type as enum ('profile', 'topic', 'article');
create type topic_status as enum ('active', 'archived');
create type article_visibility as enum ('public', 'members', 'author');
create type article_status as enum ('draft', 'published', 'hidden', 'deleted');
create type follow_target_type as enum ('user', 'topic');
create type report_status as enum ('open', 'reviewed');
create type locale as enum ('ru', 'en', 'sr');

create table users_copy (
  user_id uuid primary key,
  public_number integer not null unique,
  role user_role not null default 'member',
  can_publish boolean not null default true,
  is_restricted boolean not null default false,
  created_at timestamptz not null
);

create table profiles (
  user_id uuid primary key,
  display_name varchar(50) not null check (char_length(display_name) >= 1),
  bio varchar(500),
  avatar_url text,
  cover_url text,
  slug text unique,
  reputation integer not null default 0
);
create index profiles_display_name_trgm_idx on profiles using gin (display_name gin_trgm_ops);
create index profiles_slug_trgm_idx on profiles using gin (slug gin_trgm_ops);

create table slugs (
  slug text primary key,
  owner_type slug_owner_type not null,
  owner_id uuid not null
);
create index slugs_owner_idx on slugs (owner_type, owner_id);

create table topics (
  id uuid primary key,
  title text not null,
  description varchar(500),
  avatar_url text,
  cover_url text,
  slug text not null unique,
  status topic_status not null default 'active',
  position integer not null default 0
);

create table articles (
  id uuid primary key,
  author_id uuid not null,
  topic_id uuid not null references topics (id),
  title varchar(150) not null,
  slug text not null,
  blocks jsonb not null default '[]'::jsonb,
  visibility article_visibility not null default 'public',
  comments_enabled boolean not null default true,
  status article_status not null default 'draft',
  published_at timestamptz,
  reaction_count integer not null default 0,
  reaction_counts jsonb not null default '{}'::jsonb,
  comment_count integer not null default 0,
  view_count integer not null default 0,
  bookmark_count integer not null default 0,
  top_comment jsonb,
  excerpt text not null default '',
  first_image_url text,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_feed_idx on articles (status, published_at desc, id desc);
create index articles_topic_idx on articles (topic_id, published_at desc);
create index articles_author_idx on articles (author_id);
create index articles_search_idx on articles using gin (search_vector);

create table follows (
  follower_id uuid not null,
  target_type follow_target_type not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, target_type, target_id)
);
create index follows_target_idx on follows (target_type, target_id);

create table promotions (
  article_id uuid primary key references articles (id),
  confirmed_at timestamptz not null,
  until timestamptz not null
);

create table settings (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  logo_url text,
  locale locale not null default 'ru',
  about text not null default '',
  registration_open boolean not null default true,
  new_members_can_publish boolean not null default true
);

create table reports (
  id uuid primary key,
  article_id uuid not null references articles (id),
  reporter_id uuid not null,
  created_at timestamptz not null default now(),
  status report_status not null default 'open'
);
create unique index reports_article_reporter_idx on reports (article_id, reporter_id);

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
