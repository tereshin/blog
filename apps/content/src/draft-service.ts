import { ArticleError } from './article-error';
import type { ArticleRecord, ArticleStore, EditorJson } from './article-store';
import { renderEditor } from './render-blocks';
import { uuidV7 } from './uuid-v7';

export type UnavailableArticle = {
  view: 'unavailable';
  id: string;
};

export class DraftService {
  now: () => Date = () => new Date();

  constructor(private readonly store: ArticleStore) {}

  async open(input: { author_id: string }): Promise<ArticleRecord> {
    const article: ArticleRecord = {
      id: uuidV7(this.now().getTime()),
      author_id: input.author_id,
      category_id: null,
      slug: null,
      language: null,
      title: null,
      editor_json: { blocks: [] },
      rendered_html: '',
      version: 1,
      status: 'draft',
      removed_by: null,
      published_at: null,
      images: [],
    };
    await this.store.insert(article);
    return article;
  }

  async save(input: {
    author_id: string;
    article_id: string;
    version: number;
    editor_json: EditorJson;
    title?: string | null;
    language?: string | null;
    category_id?: string | null;
  }): Promise<ArticleRecord> {
    const article = await this.requireArticle(input.article_id);
    if (article.author_id !== input.author_id) {
      throw new ArticleError('ARTICLE_NOT_OWNED');
    }
    if (article.version !== input.version) {
      throw new ArticleError('ARTICLE_VERSION_CONFLICT', { serverVersion: article.version });
    }
    const rendered_html = renderEditor(input.editor_json);
    const saved: ArticleRecord = {
      ...article,
      editor_json: input.editor_json,
      rendered_html,
      version: article.version + 1,
      title: input.title === undefined ? article.title : input.title,
      language: input.language === undefined ? article.language : input.language,
      category_id: input.category_id === undefined ? article.category_id : input.category_id,
    };
    await this.store.update(saved);
    return saved;
  }

  async read(input: {
    viewer_id: string | null;
    article_id: string;
  }): Promise<ArticleRecord | UnavailableArticle> {
    const article = await this.requireArticle(input.article_id);
    if (article.status === 'draft' && input.viewer_id !== article.author_id) {
      return { view: 'unavailable', id: article.id };
    }
    return article;
  }

  private async requireArticle(article_id: string): Promise<ArticleRecord> {
    const article = await this.store.findById(article_id);
    if (!article) {
      throw new ArticleError('ARTICLE_NOT_FOUND');
    }
    return article;
  }
}
