export type CommentComplaint = {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  status: 'open' | 'closed_hidden' | 'dismissed';
  created_at: string;
  resolution_reason?: string | null;
};

export interface ComplaintStore {
  insert(complaint: CommentComplaint): Promise<void>;
  listOpen(): Promise<CommentComplaint[]>;
  closeOpen(comment_id: string): Promise<void>;
  dismiss(complaint_id: string, resolution_reason: string): Promise<CommentComplaint | null>;
}
