DROP INDEX IF EXISTS engagement.engagement_outbox_events_unpublished_idx;
DROP INDEX IF EXISTS engagement.engagement_bookmarks_user_created_idx;

DROP TABLE IF EXISTS engagement.outbox_events;
DROP TABLE IF EXISTS engagement.comment_like_counts;
DROP TABLE IF EXISTS engagement.article_stats;
DROP TABLE IF EXISTS engagement.comment_likes;
DROP TABLE IF EXISTS engagement.bookmarks;
DROP TABLE IF EXISTS engagement.article_likes;

DROP SCHEMA IF EXISTS engagement;
