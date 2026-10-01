import { CommentError } from './comment-error';
import type { CommentRecord, CommentStore } from './comment-store';
import type { ComplaintStore } from './complaint-store';
import type { CommentAuditAppender } from './staff-audit';
import { uuidV7 } from './uuid-v7';

type StaffRole = 'user' | 'moderator' | 'administrator';

export class StaffCommentService {
  now: () => Date = () => new Date();

  constructor(
    private readonly comments: CommentStore,
    private readonly complaints: ComplaintStore,
    private readonly audit: CommentAuditAppender,
  ) {}

  async hide(input: { actor_id: string; role: StaffRole; comment_id: string; reason: string }) {
    if (input.role !== 'moderator' && input.role !== 'administrator') {
      throw new CommentError('STAFF_FORBIDDEN');
    }
    const reason = input.reason.trim();
    if (reason.length === 0) {
      throw new CommentError('REASON_REQUIRED');
    }
    const comment = await this.comments.findById(input.comment_id);
    if (!comment) {
      throw new CommentError('COMMENT_NOT_FOUND');
    }
    const hidden: CommentRecord = { ...comment, status: 'hidden' };
    await this.complaints.closeOpen(comment.id);
    await this.comments.hide(hidden, {
      id: uuidV7(this.now().getTime()),
      event_type: 'comments.comment.hidden',
      aggregate_id: comment.id,
      payload: { comment_id: comment.id, article_id: comment.article_id },
      producer: 'comments',
      event_version: 1,
    });
    const entry = { actor_id: input.actor_id, action: 'comment.hide' as const, entity_id: comment.id, reason };
    try {
      await this.audit.append(entry);
    } catch {
      await this.audit.append(entry);
    }
    return hidden;
  }

  async staffRead(input: { role: StaffRole; comment_id: string }): Promise<CommentRecord> {
    if (input.role !== 'moderator' && input.role !== 'administrator') {
      throw new CommentError('STAFF_FORBIDDEN');
    }
    const comment = await this.comments.findById(input.comment_id);
    if (!comment) {
      throw new CommentError('COMMENT_NOT_FOUND');
    }
    return comment;
  }

  present(comment: CommentRecord, viewer_id: string | null) {
    if (comment.status === 'hidden' && viewer_id !== comment.author_id) {
      return { view: 'unavailable' as const, id: comment.id };
    }
    return {
      view: 'visible' as const,
      id: comment.id,
      body: comment.body,
      status: comment.status,
    };
  }
}
