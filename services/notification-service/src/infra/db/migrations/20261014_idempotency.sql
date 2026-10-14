create table idempotency_keys (
  user_id uuid not null,
  key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
