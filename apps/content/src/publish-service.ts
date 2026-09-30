import { ArticleError } from './article-error';
import type { ArticleRecord, ArticleStore } from './article-store';
import type { AuthorGate } from './author-gate';
import { uuidV7 } from './uuid-v7';

const content_languages = new Set(['en', 'sr-Latn', 'ru']);

function slugFrom(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function hasText(article: ArticleRecord): boolean {
  return article.rendered_html.replace(/<[^>]+>/g, '').trim().length > 0;
}

export class PublishService {
  now: () => Date = () => new Date();

  constructor(
    private readonly store: ArticleStore,
    private readonly authors: AuthorGate,
  ) {}

  async publish(input: {
    author_id: string;
    article_id: string;
    category_ids: string[];
    title: string | null;
    language: string | null;
  }): Promise<ArticleRecord> {
    const article = await this.requireOwned(input.article_id, input.author_id);
    if (!(await this.authors.hasUsername(input.author_id))) {
      throw new ArticleError('USERNAME_REQUIRED');
    }
    if (await this.authors.isBlocked(input.author_id)) {
      throw new ArticleError('ACCOUNT_BLOCKED');
    }
    if (input.category_ids.length !== 1) {
      throw new ArticleError('ARTICLE_CATEGORY_REQUIRED');
    }
    if (!input.title || input.title.trim().length === 0) {
      throw new ArticleError('ARTICLE_TITLE_REQUIRED');
    }
    if (!hasText(article)) {
      throw new ArticleError('ARTICLE_TEXT_REQUIRED');
    }
    if (!input.language || !content_languages.has(input.language)) {
      throw new ArticleError('ARTICLE_LANGUAGE_REQUIRED');
    }

    const published: ArticleRecord = {
      ...article,
      category_id: input.category_ids[0] ?? null,
      title: input.title.trim(),
      language: input.language,
      slug: slugFrom(input.title),
      status: 'published',
      removed_by: null,
      published_at: this.now().toISOString(),
    };
    await this.store.commit(published, {
      id: uuidV7(this.now().getTime()),
      event_type: 'article.published',
      aggregate_id: published.id,
      payload: { article_id: published.id, status: 'published' },
      producer: 'content',
      event_version: 1,
    });
    return published;
  }

  async withdraw(input: { author_id: string; article_id: string }): Promise<ArticleRecord> {
    const article = await this.requireOwned(input.article_id, input.author_id);
    const withdrawn: ArticleRecord = {
      ...article,
      status: 'soft_removed',
      removed_by: 'author',
    };
    await this.store.commit(withdrawn, {
      id: uuidV7(this.now().getTime()),
      event_type: 'article.soft_removed',
      aggregate_id: withdrawn.id,
      payload: { article_id: withdrawn.id, removed_by: 'author' },
      producer: 'content',
      event_version: 1,
    });
    return withdrawn;
  }

  private async requireOwned(article_id: string, author_id: string): Promise<ArticleRecord> {
    const article = await this.store.findById(article_id);
    if (!article) {
      throw new ArticleError('ARTICLE_NOT_FOUND');
    }
    if (article.author_id !== author_id) {
      throw new ArticleError('ARTICLE_NOT_OWNED');
    }
    return article;
  }
}
