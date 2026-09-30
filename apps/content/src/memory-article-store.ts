import type { ArticleRecord, ArticleRevision, ArticleStore, OutboxEvent } from './article-store';

export class MemoryArticleStore implements ArticleStore {
  readonly articles: ArticleRecord[] = [];
  readonly outbox: OutboxEvent[] = [];
  readonly revisions: ArticleRevision[] = [];

  async insert(article: ArticleRecord): Promise<void> {
    this.articles.push(structuredClone(article));
  }

  async findById(article_id: string): Promise<ArticleRecord | null> {
    const article = this.articles.find((row) => row.id === article_id);
    return article ? structuredClone(article) : null;
  }

  async update(article: ArticleRecord): Promise<void> {
    const index = this.articles.findIndex((row) => row.id === article.id);
    if (index >= 0) {
      this.articles[index] = structuredClone(article);
    }
  }

  async commit(article: ArticleRecord, event: OutboxEvent): Promise<void> {
    await this.update(article);
    this.outbox.push(event);
  }

  async revise(article: ArticleRecord, revision: ArticleRevision, event: OutboxEvent): Promise<void> {
    this.revisions.push(revision);
    await this.update(article);
    this.outbox.push(event);
  }
}
