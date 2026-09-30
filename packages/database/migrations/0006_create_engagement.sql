-- Schema engagement. The engagement service is the only writer.
-- article_id, comment_id, and user_id point at other services and are not foreign keys.
-- A View dedupe key and the unflushed increment live in Redis, not here.

CREATE SCHEMA IF NOT EXISTS engagement;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS engagement.article_likes (
  article_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS engagement.bookmarks (
  user_id uuid NOT NULL,
  article_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS engagement_bookmarks_user_created_idx
  ON engagement.bookmarks (user_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS engagement.comment_likes (
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS engagement.article_stats (
  article_id uuid PRIMARY KEY,
  like_count bigint NOT NULL DEFAULT 0,
  view_count bigint NOT NULL DEFAULT 0,
  bookmark_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
COMMENT ON TABLE engagement.article_stats IS
  'Durable counts. like_count and bookmark_count change in the same transaction as the like or bookmark row. view_count is the flushed Redis delta. A missing row means zero.';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS engagement.comment_like_counts (
  comment_id uuid PRIMARY KEY,
  like_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS engagement.outbox_events (
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
CREATE INDEX IF NOT EXISTS engagement_outbox_events_unpublished_idx
  ON engagement.outbox_events (created_at)
  WHERE published_at IS NULL;
