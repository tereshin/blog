DROP INDEX IF EXISTS messages.messages_outbox_events_unpublished_idx;
DROP INDEX IF EXISTS messages.messages_direct_messages_unread_idx;
DROP INDEX IF EXISTS messages.messages_direct_messages_conversation_created_idx;
DROP INDEX IF EXISTS messages.messages_conversation_pairs_conversation_id_idx;

DROP TABLE IF EXISTS messages.outbox_events;
DROP TABLE IF EXISTS messages.direct_messages;
DROP TABLE IF EXISTS messages.conversation_pairs;
DROP TABLE IF EXISTS messages.conversation_members;
DROP TABLE IF EXISTS messages.conversations;

DROP SCHEMA IF EXISTS messages;
