import type { ArticleRecord, ArticleStore } from './article-store';

export class MemoryArticleStore implements ArticleStore {
  readonly articles: ArticleRecord[] = [];

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
}
