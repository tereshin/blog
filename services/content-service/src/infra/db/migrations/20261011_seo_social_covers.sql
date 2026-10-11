ALTER TABLE articles ADD COLUMN seo_title varchar(200), ADD COLUMN seo_description varchar(500);
ALTER TABLE settings ADD COLUMN seo jsonb NOT NULL DEFAULT '{}', ADD COLUMN social_cover jsonb NOT NULL DEFAULT '{}';
CREATE TABLE social_covers (
  target_id text PRIMARY KEY,
  revision text NOT NULL,
  images jsonb,
  requested_at timestamptz NOT NULL DEFAULT now()
);
