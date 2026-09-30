-- Schema messages. The messaging service is the only writer.
-- A conversation is exactly two Users. user ids are not foreign keys.

CREATE SCHEMA IF NOT EXISTS messages;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages.conversations (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages.conversation_members (
  conversation_id uuid NOT NULL REFERENCES messages.conversations (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages.conversation_pairs (
  user_id_low uuid NOT NULL,
  user_id_high uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES messages.conversations (id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id_low, user_id_high)
);
--> statement-breakpoint
COMMENT ON TABLE messages.conversation_pairs IS
  'One row per pair. The service stores the lower uuid in user_id_low and the higher uuid in user_id_high.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_conversation_pairs_conversation_id_idx
  ON messages.conversation_pairs (conversation_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages.direct_messages (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES messages.conversations (id) ON DELETE RESTRICT,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
--> statement-breakpoint
COMMENT ON TABLE messages.direct_messages IS
  'body must contain text. The service rejects an empty body. read_at is the read mark the sender sees.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_direct_messages_conversation_created_idx
  ON messages.direct_messages (conversation_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_direct_messages_unread_idx
  ON messages.direct_messages (conversation_id)
  WHERE read_at IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages.outbox_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  correlation_id uuid,
  causation_id uuid,
  producer text NOT NULL,
  event_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_outbox_events_unpublished_idx
  ON messages.outbox_events (created_at)
  WHERE published_at IS NULL;
