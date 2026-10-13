CREATE TABLE nav_sections (
  id uuid PRIMARY KEY,
  title varchar(80) NOT NULL CHECK (length(trim(title)) > 0),
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nav_sections_position_idx ON nav_sections (position);

CREATE TABLE nav_section_items (
  id uuid PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES nav_sections (id) ON DELETE CASCADE,
  title varchar(80) NOT NULL CHECK (length(trim(title)) > 0),
  icon varchar(40) CHECK (icon IS NULL OR icon ~ '^[a-z0-9_]{1,40}$'),
  page_id uuid REFERENCES pages (id) ON DELETE SET NULL,
  url text CHECK (url IS NULL OR (char_length(url) <= 2000 AND url ~ '^https?://')),
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (page_id IS NULL OR url IS NULL)
);
CREATE INDEX nav_section_items_section_idx ON nav_section_items (section_id, position);
CREATE INDEX nav_section_items_page_idx ON nav_section_items (page_id);

CREATE TABLE nav_section_mutations (
  actor_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  request_fingerprint text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, idempotency_key)
);
