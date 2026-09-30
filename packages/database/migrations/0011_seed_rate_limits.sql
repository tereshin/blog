-- Lookup rows for the Administrator-editable rate limits.
-- Changing a number is an update of max_count or window_seconds, not a new migration.

INSERT INTO users.rate_limit_settings (action, max_count, window_seconds)
VALUES
  ('comment', 20, 60),
  ('like', 60, 60),
  ('follow', 30, 60),
  ('direct_message', 60, 60),
  ('article_edit', 60, 60),
  ('image_attachment', 20, 3600),
  ('anonymous_read', 60, 60)
ON CONFLICT (action) DO NOTHING;
