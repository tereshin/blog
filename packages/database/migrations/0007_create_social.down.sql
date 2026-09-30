DROP INDEX IF EXISTS social.social_outbox_events_unpublished_idx;

DROP TABLE IF EXISTS social.outbox_events;
DROP TABLE IF EXISTS social.category_follows;
DROP TABLE IF EXISTS social.user_follows;

DROP SCHEMA IF EXISTS social;
