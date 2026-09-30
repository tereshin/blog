-- Schema content. The content service is the only writer.
-- author_id and category_id point at other services and are not foreign keys.

CREATE SCHEMA IF NOT EXISTS content;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS content.articles (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL,
  category_id uuid,
  slug text,
  language text,
  title text,
  editor_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_html text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  removed_by text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_articles_slug_key UNIQUE (slug)
);
--> statement-breakpoint
COMMENT ON TABLE content.articles IS
  'status is draft, published, hidden, or soft_removed. removed_by is author or staff, and only when status is soft_removed. Publish requires a title, text, one category_id, and a language. The service checks that. A stale save compares version.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_articles_published_fresh_idx
  ON content.articles (published_at DESC)
  WHERE status = 'published';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_articles_published_language_idx
  ON content.articles (language, published_at DESC)
  WHERE status = 'published';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_articles_author_published_idx
  ON content.articles (author_id, published_at DESC)
  WHERE status = 'published';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_articles_category_published_idx
  ON content.articles (category_id, published_at DESC)
  WHERE status = 'published';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS content.article_revisions (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES content.articles (id) ON DELETE RESTRICT,
  version integer NOT NULL,
  title text,
  editor_json jsonb NOT NULL,
  rendered_html text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_article_revisions_article_version_key UNIQUE (article_id, version)
);
--> statement-breakpoint
COMMENT ON TABLE content.article_revisions IS
  'Previous Article text. Kept so a revision does not destroy it. Not returned as a list in this release.';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS content.article_images (
  article_id uuid NOT NULL REFERENCES content.articles (id) ON DELETE RESTRICT,
  media_id uuid NOT NULL,
  position integer NOT NULL,
  PRIMARY KEY (article_id, media_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS content.article_complaints (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES content.articles (id) ON DELETE RESTRICT,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution_reason text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
COMMENT ON TABLE content.article_complaints IS
  'status is open, closed_hidden, or dismissed. Comment complaints live in schema comments.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_article_complaints_article_id_idx
  ON content.article_complaints (article_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_article_complaints_open_idx
  ON content.article_complaints (created_at)
  WHERE status = 'open';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS content.outbox_events (
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
CREATE INDEX IF NOT EXISTS content_outbox_events_unpublished_idx
  ON content.outbox_events (created_at)
  WHERE published_at IS NULL;
