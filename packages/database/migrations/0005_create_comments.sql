-- Schema comments. The comments service is the only writer.
-- article_id and author_id point at other services and are not foreign keys.

CREATE SCHEMA IF NOT EXISTS comments;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS comments.comments (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL,
  author_id uuid NOT NULL,
  parent_id uuid REFERENCES comments.comments (id) ON DELETE RESTRICT,
  root_id uuid NOT NULL REFERENCES comments.comments (id) ON DELETE RESTRICT,
  depth integer NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
COMMENT ON TABLE comments.comments IS
  'status is visible or hidden. depth 1 is a Comment on the Article. A reply past depth 3 stays stored at its real depth. root_id is the top Comment, and for a top Comment it equals id.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS comments_comments_article_created_idx
  ON comments.comments (article_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS comments_comments_created_at_idx
  ON comments.comments (created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS comments_comments_parent_id_idx
  ON comments.comments (parent_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS comments_comments_root_id_idx
  ON comments.comments (root_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS comments.comment_mentions (
  comment_id uuid NOT NULL REFERENCES comments.comments (id) ON DELETE RESTRICT,
  mentioned_user_id uuid NOT NULL,
  PRIMARY KEY (comment_id, mentioned_user_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS comments.comment_complaints (
  id uuid PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES comments.comments (id) ON DELETE RESTRICT,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution_reason text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
COMMENT ON TABLE comments.comment_complaints IS
  'status is open, closed_hidden, or dismissed. Article complaints live in schema content.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS comments_comment_complaints_comment_id_idx
  ON comments.comment_complaints (comment_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS comments_comment_complaints_open_idx
  ON comments.comment_complaints (created_at)
  WHERE status = 'open';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS comments.outbox_events (
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
CREATE INDEX IF NOT EXISTS comments_outbox_events_unpublished_idx
  ON comments.outbox_events (created_at)
  WHERE published_at IS NULL;
