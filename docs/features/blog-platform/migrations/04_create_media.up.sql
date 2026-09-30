-- Schema media. The media service is the only writer.
-- Object bytes live in object storage. This table is the upload record.

CREATE SCHEMA IF NOT EXISTS media;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS media.media_objects (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL,
  object_key text NOT NULL,
  content_type text,
  byte_size bigint,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT media_media_objects_object_key_key UNIQUE (object_key)
);
--> statement-breakpoint
COMMENT ON TABLE media.media_objects IS
  'status is pending or ready. A row is inserted when the presigned URL is issued and marked ready when the upload finishes. An Article stores media_id in content.article_images.';
