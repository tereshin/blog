export type ArticleComplaint = {
  id: string;
  article_id: string;
  reporter_id: string;
  reason: string;
  status: 'open';
  created_at: string;
};

export interface ComplaintStore {
  insert(complaint: ArticleComplaint): Promise<void>;
  listOpen(): Promise<ArticleComplaint[]>;
}
