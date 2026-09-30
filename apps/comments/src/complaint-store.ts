export type CommentComplaint = {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  status: 'open';
  created_at: string;
};

export interface ComplaintStore {
  insert(complaint: CommentComplaint): Promise<void>;
  listOpen(): Promise<CommentComplaint[]>;
}
