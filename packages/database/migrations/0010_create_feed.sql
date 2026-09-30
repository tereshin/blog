-- Schema feed. The feed service is the only writer.
-- Fresh, Popular, and My feed pages are Redis cache entries, not tables.
-- My feed is assembled on read. There is no inbox table.

CREATE SCHEMA IF NOT EXISTS feed;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS feed.popular_weights (
  id uuid PRIMARY KEY,
  views_weight numeric NOT NULL,
  likes_weight numeric NOT NULL,
  comments_weight numeric NOT NULL,
  bookmarks_weight numeric NOT NULL,
  age_decay numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
COMMENT ON TABLE feed.popular_weights IS
  'One row. Equal weights are the starting score until the open Popular-weight question is closed. Age lowers the score by age_decay per hour.';
--> statement-breakpoint
INSERT INTO feed.popular_weights (
  id,
  views_weight,
  likes_weight,
  comments_weight,
  bookmarks_weight,
  age_decay
) VALUES (
  '018f3c2a-7b10-7c3e-8f21-000000000002',
  1,
  1,
  1,
  1,
  1
) ON CONFLICT (id) DO NOTHING;
