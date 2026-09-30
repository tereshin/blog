DROP INDEX IF EXISTS content.content_outbox_events_unpublished_idx;
DROP INDEX IF EXISTS content.content_article_complaints_open_idx;
DROP INDEX IF EXISTS content.content_article_complaints_article_id_idx;
DROP INDEX IF EXISTS content.content_articles_category_published_idx;
DROP INDEX IF EXISTS content.content_articles_author_published_idx;
DROP INDEX IF EXISTS content.content_articles_published_language_idx;
DROP INDEX IF EXISTS content.content_articles_published_fresh_idx;

DROP TABLE IF EXISTS content.outbox_events;
DROP TABLE IF EXISTS content.article_complaints;
DROP TABLE IF EXISTS content.article_images;
DROP TABLE IF EXISTS content.article_revisions;
DROP TABLE IF EXISTS content.articles;

DROP SCHEMA IF EXISTS content;
