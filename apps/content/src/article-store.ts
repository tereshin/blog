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
  images: { media_id: string; position: number }[];
};

export type ArticleRevision = {
  id: string;
  article_id: string;
  version: number;
  title: string | null;
  editor_json: EditorJson;
  rendered_html: string;
  created_by: string;
};

export type OutboxEvent = {
  id: string;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  producer: string;
  event_version: number;
};

export interface ArticleStore {
  insert(article: ArticleRecord): Promise<void>;
  findById(article_id: string): Promise<ArticleRecord | null>;
  update(article: ArticleRecord): Promise<void>;
  commit(article: ArticleRecord, event: OutboxEvent): Promise<void>;
  revise(article: ArticleRecord, revision: ArticleRevision, event: OutboxEvent): Promise<void>;
}
