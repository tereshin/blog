export type EditorBlock = {
  type: string;
  data?: Record<string, unknown>;
};

export type EditorJson = {
  blocks: EditorBlock[];
};

export type ArticleRecord = {
  id: string;
  author_id: string;
  category_id: string | null;
  slug: string | null;
  language: string | null;
  title: string | null;
  editor_json: EditorJson;
  rendered_html: string;
  version: number;
  status: 'draft' | 'published' | 'hidden' | 'soft_removed';
  removed_by: 'author' | 'staff' | null;
  published_at: string | null;
  images: [];
};

export interface ArticleStore {
  insert(article: ArticleRecord): Promise<void>;
  findById(article_id: string): Promise<ArticleRecord | null>;
  update(article: ArticleRecord): Promise<void>;
}
