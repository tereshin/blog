DROP INDEX IF EXISTS comments.comments_outbox_events_unpublished_idx;
DROP INDEX IF EXISTS comments.comments_comment_complaints_open_idx;
DROP INDEX IF EXISTS comments.comments_comment_complaints_comment_id_idx;
DROP INDEX IF EXISTS comments.comments_comments_root_id_idx;
DROP INDEX IF EXISTS comments.comments_comments_parent_id_idx;
DROP INDEX IF EXISTS comments.comments_comments_created_at_idx;
DROP INDEX IF EXISTS comments.comments_comments_article_created_idx;

DROP TABLE IF EXISTS comments.outbox_events;
DROP TABLE IF EXISTS comments.comment_complaints;
DROP TABLE IF EXISTS comments.comment_mentions;
DROP TABLE IF EXISTS comments.comments;

DROP SCHEMA IF EXISTS comments;
