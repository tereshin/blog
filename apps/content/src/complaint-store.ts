export type ArticleComplaint = {
  id: string;
  article_id: string;
  reporter_id: string;
  reason: string;
  status: 'open' | 'closed_hidden' | 'dismissed';
  created_at: string;
  resolution_reason?: string | null;
};

export interface ComplaintStore {
  insert(complaint: ArticleComplaint): Promise<void>;
  listOpen(): Promise<ArticleComplaint[]>;
  closeOpen(article_id: string): Promise<void>;
  dismiss(complaint_id: string, resolution_reason: string): Promise<ArticleComplaint | null>;
}
