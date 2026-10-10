ALTER TABLE comments ADD COLUMN media jsonb NOT NULL DEFAULT '[]', ADD COLUMN mentions jsonb NOT NULL DEFAULT '[]';
CREATE TABLE comment_bookmarks (user_id uuid NOT NULL, comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, comment_id));
CREATE INDEX comment_bookmarks_user_idx ON comment_bookmarks(user_id, created_at DESC, comment_id DESC);
CREATE TABLE comment_reports (id uuid PRIMARY KEY, comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE, reporter_id uuid NOT NULL, reason text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed')), reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(comment_id, reporter_id));
CREATE INDEX comment_reports_status_idx ON comment_reports(status, created_at DESC, id DESC);
CREATE TABLE discussion_subscriptions (user_id uuid NOT NULL, article_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, article_id));
CREATE INDEX discussion_subscriptions_article_idx ON discussion_subscriptions(article_id);
CREATE INDEX comments_root_sort_idx ON comments(article_id, reaction_count DESC, created_at DESC, id DESC) WHERE parent_id IS NULL;
CREATE INDEX comments_reply_sort_idx ON comments(parent_id, reaction_count DESC, created_at DESC, id DESC);
