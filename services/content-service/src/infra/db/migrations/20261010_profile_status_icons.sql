ALTER TABLE settings ADD COLUMN profile_status_icons jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN status_icon_id uuid;
