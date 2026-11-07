create table email_flows (
  id uuid primary key,
  email text not null,
  purpose text not null check (purpose in ('registration', 'password_reset')),
  user_id uuid references users(id),
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  resend_at timestamptz not null,
  verified_until timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null
);
create index email_flows_email_created_idx on email_flows(email, created_at desc);
create table auth_email_jobs (
  id uuid primary key,
  flow_id uuid not null references email_flows(id) on delete cascade,
  encrypted_message text not null,
  attempts integer not null default 0,
  available_at timestamptz not null,
  expires_at timestamptz not null
);
create index auth_email_jobs_available_idx on auth_email_jobs(available_at);
