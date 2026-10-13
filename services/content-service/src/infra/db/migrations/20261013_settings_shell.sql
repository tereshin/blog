ALTER TABLE settings
  ADD COLUMN shell jsonb NOT NULL DEFAULT '{"popular":true,"fresh":true,"mine":true,"messages":true,"rating":true,"popular_comments":true}'::jsonb;
