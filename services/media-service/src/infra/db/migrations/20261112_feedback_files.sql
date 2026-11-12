CREATE TABLE feedback_files (id uuid PRIMARY KEY, token_hash text NOT NULL, name text NOT NULL, mime text NOT NULL, byte_size integer NOT NULL, content text NOT NULL, key text NOT NULL, submission_id uuid, expires_at timestamptz NOT NULL);
CREATE UNIQUE INDEX feedback_files_token_key ON feedback_files(token_hash, key);
CREATE INDEX feedback_files_expiry ON feedback_files(expires_at);
