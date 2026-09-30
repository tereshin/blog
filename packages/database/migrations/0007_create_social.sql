-- Schema social. The social service is the only writer.
-- User and Category ids point at other services and are not foreign keys.

CREATE SCHEMA IF NOT EXISTS social;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS social.user_follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS social.category_follows (
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS social.outbox_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  correlation_id uuid,
  causation_id uuid,
  producer text NOT NULL,
  event_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS social_outbox_events_unpublished_idx
  ON social.outbox_events (created_at)
  WHERE published_at IS NULL;
