CREATE TABLE media_storage_configs (
  id uuid PRIMARY KEY,
  public_url text NOT NULL,
  encrypted_config text NOT NULL
);
CREATE TABLE media_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  compression jsonb NOT NULL,
  storage_id uuid REFERENCES media_storage_configs(id)
);
ALTER TABLE files ADD COLUMN storage_id uuid REFERENCES media_storage_configs(id);
