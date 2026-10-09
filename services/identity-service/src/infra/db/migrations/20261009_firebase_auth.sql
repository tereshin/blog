alter table users add column email_verified boolean not null default false;

-- Существующие адреса пришли подтверждёнными (Google или seed).
update users set email_verified = true where email <> '';

drop index if exists users_email_lower_idx;
create unique index users_email_lower_idx on users (lower(email)) where email <> '';

create table auth_identities (
  id uuid primary key,
  user_id uuid not null references users (id),
  firebase_uid text not null unique,
  provider_id text not null,
  created_at timestamptz not null default now()
);
create index auth_identities_user_idx on auth_identities (user_id);

insert into auth_identities (id, user_id, firebase_uid, provider_id, created_at)
select gen_random_uuid(), id, google_sub, 'google.com', created_at
from users
where google_sub is not null and google_sub <> '';

alter table users drop column google_sub;

drop table if exists auth_states;

create table auth_idempotency (
  scope text not null,
  key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (scope, key)
);
