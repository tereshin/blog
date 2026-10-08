create table auth_states (
  state text primary key,
  code_verifier text not null,
  nonce text not null,
  return_to text not null,
  created_at timestamptz not null default now()
);
