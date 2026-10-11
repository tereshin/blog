CREATE TABLE outbox (
  id uuid PRIMARY KEY, name text NOT NULL, payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE INDEX outbox_pending_idx ON outbox (created_at) WHERE published_at IS NULL;
CREATE TABLE processed_events (
  event_id uuid NOT NULL, consumer text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (consumer, event_id)
);
CREATE TABLE social_cover_jobs (
  target_id text NOT NULL, revision text NOT NULL, event jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_id uuid,
  last_error text, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (target_id, revision)
);
CREATE INDEX social_cover_jobs_pending_idx ON social_cover_jobs (available_at) WHERE status IN ('pending', 'processing');
