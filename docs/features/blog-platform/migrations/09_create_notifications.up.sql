-- Schema notifications. The notification service is the only writer.
-- In-product notices only. No email column and no phone column.

CREATE SCHEMA IF NOT EXISTS notifications;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS notifications.notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  actor_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  source_event_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_notifications_user_event_key UNIQUE (user_id, source_event_id)
);
--> statement-breakpoint
COMMENT ON TABLE notifications.notifications IS
  'type is reply, mention, follow, or direct_message. The client localizes the text. source_event_id makes a repeated delivery insert nothing.';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_notifications_user_created_idx
  ON notifications.notifications (user_id, created_at DESC);
