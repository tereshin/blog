ALTER TABLE settings ADD COLUMN logo_dark_url text;
ALTER TABLE settings ADD COLUMN favicon jsonb NOT NULL DEFAULT '{"png":null,"svg":null,"ico":null,"apple":null,"manifest":null}'::jsonb;
