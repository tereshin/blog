import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { ArticleRecord, ArticleRevision, ArticleStore, EditorJson, OutboxEvent } from './article-store';
import { article_revisions, articles, outbox_events } from './content-schema';

function toRecord(row: typeof articles.$inferSelect): ArticleRecord {
  return {
    id: row.id,
    author_id: row.author_id,
    category_id: row.category_id,
    slug: row.slug,
    language: row.language,
    title: row.title,
    editor_json: row.editor_json as EditorJson,
    rendered_html: row.rendered_html,
    version: row.version,
    status: row.status as ArticleRecord['status'],
    removed_by: row.removed_by as ArticleRecord['removed_by'],
    published_at: row.published_at,
    images: [],
  };
}

export class DrizzleArticleStore implements ArticleStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async insert(article: ArticleRecord): Promise<void> {
    await this.db.insert(articles).values({
      id: article.id,
      author_id: article.author_id,
      category_id: article.category_id,
      slug: article.slug,
      language: article.language,
      title: article.title,
      editor_json: article.editor_json,
      rendered_html: article.rendered_html,
      version: article.version,
      status: article.status,
      removed_by: article.removed_by,
      published_at: article.published_at,
    });
  }

  async findById(article_id: string): Promise<ArticleRecord | null> {
    const rows = await this.db.select().from(articles).where(eq(articles.id, article_id)).limit(1);
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  async update(article: ArticleRecord): Promise<void> {
    await this.db
      .update(articles)
      .set({
        category_id: article.category_id,
        language: article.language,
        title: article.title,
        editor_json: article.editor_json,
        rendered_html: article.rendered_html,
        version: article.version,
        status: article.status,
        removed_by: article.removed_by,
        published_at: article.published_at,
        updated_at: new Date().toISOString(),
      })
      .where(eq(articles.id, article.id));
  }

  async commit(article: ArticleRecord, event: OutboxEvent): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(articles)
        .set({
          category_id: article.category_id,
          slug: article.slug,
          language: article.language,
          title: article.title,
          editor_json: article.editor_json,
          rendered_html: article.rendered_html,
          version: article.version,
          status: article.status,
          removed_by: article.removed_by,
          published_at: article.published_at,
          updated_at: new Date().toISOString(),
        })
        .where(eq(articles.id, article.id));
      await tx.insert(outbox_events).values({
        id: event.id,
        event_type: event.event_type,
        aggregate_id: event.aggregate_id,
        payload: event.payload,
        producer: event.producer,
        event_version: event.event_version,
      });
    });
  }

  async revise(article: ArticleRecord, revision: ArticleRevision, event: OutboxEvent): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(article_revisions).values({
        id: revision.id,
        article_id: revision.article_id,
        version: revision.version,
        title: revision.title,
        editor_json: revision.editor_json,
        rendered_html: revision.rendered_html,
        created_by: revision.created_by,
      });
      await tx
        .update(articles)
        .set({
          title: article.title,
          editor_json: article.editor_json,
          rendered_html: article.rendered_html,
          version: article.version,
          updated_at: new Date().toISOString(),
        })
        .where(eq(articles.id, article.id));
      await tx.insert(outbox_events).values({
        id: event.id,
        event_type: event.event_type,
        aggregate_id: event.aggregate_id,
        payload: event.payload,
        producer: event.producer,
        event_version: event.event_version,
      });
    });
  }
}
