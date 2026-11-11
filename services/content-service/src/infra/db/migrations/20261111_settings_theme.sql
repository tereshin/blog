ALTER TABLE settings
  ADD COLUMN theme jsonb NOT NULL DEFAULT '{"radius_card":"1rem","header_overlay_hue":270,"header_overlay_opacity":90,"header_overlay_blur_px":4}'::jsonb;
