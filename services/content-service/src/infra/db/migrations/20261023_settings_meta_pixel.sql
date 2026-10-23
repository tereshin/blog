ALTER TABLE settings ADD COLUMN meta_pixel_id text CHECK (meta_pixel_id IS NULL OR meta_pixel_id ~ '^[0-9]{5,25}$');
