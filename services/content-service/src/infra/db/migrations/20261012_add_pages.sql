CREATE TYPE page_status AS ENUM ('draft', 'published', 'deleted');
CREATE TABLE pages (
  id uuid PRIMARY KEY, title varchar(150) NOT NULL CHECK (length(trim(title)) > 0),
  slug varchar(40) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  blocks jsonb NOT NULL DEFAULT '{"blocks":[]}', status page_status NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_by uuid NOT NULL, updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz, deleted_at timestamptz,
  CHECK ((status = 'deleted') = (deleted_at IS NOT NULL)), CHECK (status != 'published' OR published_at IS NOT NULL)
);
CREATE INDEX pages_list_idx ON pages (created_at DESC, id DESC);
CREATE INDEX pages_status_idx ON pages (status, created_at DESC, id DESC);
CREATE TABLE page_mutations (
  actor_id uuid NOT NULL, idempotency_key text NOT NULL, request_fingerprint text NOT NULL,
  response_status integer NOT NULL, response_body jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, idempotency_key)
);
