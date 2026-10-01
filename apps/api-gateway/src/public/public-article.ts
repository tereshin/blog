import { RateLimitedError, type SlidingWindowLimiter } from '../rate-limit/sliding-window';

export type ArticleSourceRow = {
  view: 'published' | 'unavailable' | 'author';
  id: string;
  slug?: string;
  title?: string;
  language?: string;
  category_id?: string;
  author_id?: string;
  rendered_html?: string;
  images?: Array<{ media_id: string; position: number; url: string }>;
  status?: string;
  version?: number;
  readers_can_see?: boolean;
};

export interface ArticleCatalog {
  findBySlug(slug: string): Promise<ArticleSourceRow | null>;
  findById(article_id: string): Promise<ArticleSourceRow | null>;
}

export interface PublicAuthors {
  find(user_id: string): Promise<{ id: string; username: string } | null>;
}

export type CommentPage = {
  items: Array<{ id: string; body: string }>;
  has_next: boolean;
  has_prev: boolean;
  next_cursor: string | null;
};

export interface ArticleComments {
  list(article_id: string): Promise<CommentPage>;
}

export type ArticleCounts = {
  like_count: number;
  comment_count: number;
  view_count: number;
  liked_by_viewer: boolean;
  bookmarked_by_viewer: boolean;
};

export interface ArticleEngagement {
  counts(article_id: string, viewer_id: string): Promise<ArticleCounts>;
}

export type GuestAction = 'like' | 'comment' | 'follow' | 'bookmark' | 'publish' | 'direct_message';

export interface GuestCommands {
  run(action: GuestAction): Promise<void>;
}

const status_by_code = {
  AUTH_REQUIRED: 401,
  ARTICLE_NOT_FOUND: 404,
  RATE_LIMITED: 429,
} as const;

export class PublicReadError extends Error {
  readonly status_code: number;
  readonly params: Record<string, unknown>;

  constructor(
    readonly code: keyof typeof status_by_code,
    params: Record<string, unknown> = {},
  ) {
    super(code);
    this.status_code = status_by_code[code];
    this.params = params;
  }
}

export class PublicArticleService {
  now: () => number = () => Date.now();
  last_elapsed_ms = 0;

  constructor(
    private readonly articles: ArticleCatalog,
    private readonly authors: PublicAuthors,
    private readonly comments: ArticleComments,
    private readonly engagement: ArticleEngagement,
    private readonly limiter: SlidingWindowLimiter,
    private readonly commands: GuestCommands,
  ) {}

  async readBySlug(input: { slug: string; user_id: string; visitor: string }) {
    return this.compose(() => this.articles.findBySlug(input.slug), input);
  }

  async readById(input: { article_id: string; user_id: string; visitor: string }) {
    return this.compose(() => this.articles.findById(input.article_id), input);
  }

  async write(input: { user_id: string; action: GuestAction }): Promise<void> {
    if (!input.user_id) {
      throw new PublicReadError('AUTH_REQUIRED');
    }
    await this.commands.run(input.action);
  }

  private async compose(
    load: () => Promise<ArticleSourceRow | null>,
    input: { user_id: string; visitor: string },
  ) {
    const started = this.now();
    try {
      if (!input.user_id) {
        await this.limiter.consume({
          action: 'anonymous_read',
          subject: input.visitor,
          now_ms: started,
        });
      }
      const article = await load();
      if (!article) {
        throw new PublicReadError('ARTICLE_NOT_FOUND');
      }
      if (article.view !== 'published') {
        if (article.view === 'author') {
          return {
            view: 'author' as const,
            id: article.id,
            status: article.status,
            readers_can_see: article.readers_can_see ?? false,
            title: article.title,
            rendered_html: article.rendered_html,
            language: article.language,
            version: article.version,
          };
        }
        return { view: 'unavailable' as const, id: article.id };
      }
      const author = await this.authors.find(article.author_id ?? '');
      const comments = await this.comments.list(article.id);
      const counts = await this.engagement.counts(article.id, input.user_id);
      const published = {
        view: 'published' as const,
        id: article.id,
        slug: article.slug ?? '',
        title: article.title ?? '',
        language: article.language ?? 'en',
        category_id: article.category_id,
        author: { id: author?.id ?? article.author_id ?? '', username: author?.username ?? '' },
        rendered_html: article.rendered_html ?? '',
        images: article.images ?? [],
        like_count: counts.like_count,
        comment_count: counts.comment_count,
        view_count: counts.view_count,
        comments,
      };
      if (!input.user_id) {
        return published;
      }
      return {
        ...published,
        liked_by_viewer: counts.liked_by_viewer,
        bookmarked_by_viewer: counts.bookmarked_by_viewer,
      };
    } catch (error) {
      if (error instanceof RateLimitedError) {
        throw new PublicReadError('RATE_LIMITED', error.params);
      }
      throw error;
    } finally {
      this.last_elapsed_ms = this.now() - started;
    }
  }
}
