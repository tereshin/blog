-- Schema users. The users service is the only writer.
-- Identifiers of other services are plain uuid columns. No cross-schema foreign keys.
-- Primary keys are app-generated UUIDv7. This file does not generate them.

CREATE SCHEMA IF NOT EXISTS users;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS users.users (
  id uuid PRIMARY KEY,
  firebase_uid text NOT NULL,
  username text,
  display_name text,
  biography text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  content_languages text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_users_firebase_uid_key UNIQUE (firebase_uid),
  CONSTRAINT users_users_username_key UNIQUE (username)
);
--> statement-breakpoint
COMMENT ON TABLE users.users IS
  'role is user, moderator, or administrator. Exactly one. content_languages NULL means every Content language.';
--> statement-breakpoint
COMMENT ON COLUMN users.users.firebase_uid IS
  'Firebase UID lookup key. Never the primary key.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_users_created_at_idx
  ON users.users (created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_users_administrator_idx
  ON users.users (id)
  WHERE role = 'administrator';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS users.user_sign_ins (
  user_id uuid NOT NULL REFERENCES users.users (id) ON DELETE RESTRICT,
  signed_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, signed_on)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_user_sign_ins_signed_on_idx
  ON users.user_sign_ins (signed_on);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS users.blocks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users.users (id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES users.users (id) ON DELETE RESTRICT,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  lifted_by uuid REFERENCES users.users (id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_blocks_user_id_idx
  ON users.blocks (user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS users_blocks_one_active_idx
  ON users.blocks (user_id)
  WHERE lifted_at IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_blocks_actor_id_idx
  ON users.blocks (actor_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_blocks_lifted_by_idx
  ON users.blocks (lifted_by);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS users.rate_limit_settings (
  action text PRIMARY KEY,
  max_count integer NOT NULL,
  window_seconds integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS users.admin_audit_log (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES users.users (id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
COMMENT ON TABLE users.admin_audit_log IS
  'Append-only. reason is required by the service for hide, Block, role change, staff soft-remove, and Complaint dismissal. A Category change may omit it.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_admin_audit_log_created_at_idx
  ON users.admin_audit_log (created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_admin_audit_log_actor_created_idx
  ON users.admin_audit_log (actor_id, created_at DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION users.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS admin_audit_log_append_only ON users.admin_audit_log;
--> statement-breakpoint
CREATE TRIGGER admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON users.admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION users.reject_audit_mutation();
--> statement-breakpoint
-- Operator bootstrap. Replace firebase_uid with the real Firebase account before the admin panel is used.
-- The panel cannot create this first Administrator.
INSERT INTO users.users (
  id,
  firebase_uid,
  username,
  display_name,
  role,
  created_at,
  updated_at
) VALUES (
  '018f3c2a-7b10-7c3e-8f21-000000000001',
  'seed-admin',
  'seed-admin',
  'Test User',
  'administrator',
  TIMESTAMPTZ '2026-01-01 00:00:00+00',
  TIMESTAMPTZ '2026-01-01 00:00:00+00'
) ON CONFLICT (firebase_uid) DO NOTHING;
