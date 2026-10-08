create type file_kind as enum ('image', 'attachment');

create table files (
  id uuid primary key,
  uploader_id uuid not null,
  kind file_kind not null,
  mime text not null,
  byte_size integer not null,
  url text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now()
);
create unique index files_uploader_key_idx on files (uploader_id, idempotency_key);

create table seed_runs (
  profile text primary key,
  anchor_at timestamptz not null,
  started_at timestamptz not null,
  finished_at timestamptz
);
