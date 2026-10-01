import { CommentError } from './comment-error';
import type { CommentStore } from './comment-store';
import type { CommentComplaint, ComplaintStore } from './complaint-store';
import { uuidV7 } from './uuid-v7';

export type ComplaintCreated = {
  id: string;
  target_type: 'comment';
  target_id: string;
  status: 'open';
};

export class ComplaintService {
  now: () => Date = () => new Date();

  constructor(
    private readonly comments: CommentStore,
    private readonly complaints: ComplaintStore,
  ) {}

  async file(input: {
    comment_id: string;
    reporter_id: string;
    reason: string;
  }): Promise<ComplaintCreated> {
    const reason = input.reason.trim();
    if (reason.length === 0) {
      throw new CommentError('COMPLAINT_REASON_REQUIRED');
    }
    const comment = await this.comments.findById(input.comment_id);
    if (!comment) {
      throw new CommentError('COMMENT_NOT_FOUND');
    }
    const complaint: CommentComplaint = {
      id: uuidV7(this.now().getTime()),
      comment_id: comment.id,
      reporter_id: input.reporter_id,
      reason,
      status: 'open',
      created_at: this.now().toISOString(),
    };
    await this.complaints.insert(complaint);
    return {
      id: complaint.id,
      target_type: 'comment',
      target_id: comment.id,
      status: 'open',
    };
  }

  async listOpen(): Promise<CommentComplaint[]> {
    return this.complaints.listOpen();
  }

  async dismiss(complaint_id: string, reason: string): Promise<CommentComplaint> {
    const resolution_reason = reason.trim();
    if (resolution_reason.length === 0) {
      throw new CommentError('REASON_REQUIRED');
    }
    const complaint = await this.complaints.dismiss(complaint_id, resolution_reason);
    if (!complaint) {
      throw new CommentError('COMPLAINT_NOT_FOUND');
    }
    return complaint;
  }
}
