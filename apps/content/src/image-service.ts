import { ArticleError } from './article-error';
import type { ArticleRecord, ArticleStore } from './article-store';

export interface ReadyMedia {
  findReady(media_id: string): Promise<{ id: string } | null>;
}

export class ImageService {
  constructor(
    private readonly store: ArticleStore,
    private readonly media: ReadyMedia,
  ) {}

  async attach(input: {
    author_id: string;
    article_id: string;
    media_id: string;
  }): Promise<ArticleRecord> {
    const article = await this.store.findById(input.article_id);
    if (!article) {
      throw new ArticleError('ARTICLE_NOT_FOUND');
    }
    if (article.author_id !== input.author_id) {
      throw new ArticleError('ARTICLE_NOT_OWNED');
    }
    const ready = await this.media.findReady(input.media_id);
    if (!ready) {
      throw new ArticleError('MEDIA_NOT_FOUND');
    }
    const linked: ArticleRecord = {
      ...article,
      images: [...article.images, { media_id: ready.id, position: article.images.length }],
    };
    await this.store.update(linked);
    return linked;
  }
}
