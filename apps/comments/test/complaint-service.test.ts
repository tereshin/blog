import { describe, expect, it } from 'vitest';
import type { ArticleVisibility } from '../src/article-visibility';
import { CommentService } from '../src/comment-service';
import { ComplaintService } from '../src/complaint-service';
import { MemoryCommentStore } from '../src/memory-comment-store';
import { MemoryComplaintStore } from '../src/memory-complaint-store';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const reporter_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const missing_comment = '018f3c2a-7b10-7c3e-8f21-0000000000d9';

const visible: ArticleVisibility = {
  async isPublished() {
    return true;
  },
};

describe('comment complaints', () => {
  it('stores an open complaint a moderator can list and leaves the comment visible', async () => {
    const comments = new MemoryCommentStore();
    const complaints = new MemoryComplaintStore();
    const comment = await new CommentService(comments, visible).comment({
      article_id,
      author_id,
      body: 'Hello',
    });
    const service = new ComplaintService(comments, complaints);

    const filed = await service.file({
      comment_id: comment.id,
      reporter_id,
      reason: 'Please review this',
    });

    expect(filed).toMatchObject({
      target_type: 'comment',
      target_id: comment.id,
      status: 'open',
    });
    expect(await service.listOpen()).toEqual([
      expect.objectContaining({
        id: filed.id,
        comment_id: comment.id,
        reporter_id,
        reason: 'Please review this',
        status: 'open',
      }),
    ]);
    expect((await comments.findById(comment.id))?.status).toBe('visible');
  });

  it('refuses a blank reason and an unknown comment', async () => {
    const comments = new MemoryCommentStore();
    const complaints = new MemoryComplaintStore();
    const comment = await new CommentService(comments, visible).comment({
      article_id,
      author_id,
      body: 'Hello',
    });
    const service = new ComplaintService(comments, complaints);

    await expect(
      service.file({ comment_id: comment.id, reporter_id, reason: '  ' }),
    ).rejects.toMatchObject({ code: 'COMPLAINT_REASON_REQUIRED' });
    await expect(
      service.file({ comment_id: missing_comment, reporter_id, reason: 'Missing' }),
    ).rejects.toMatchObject({ code: 'COMMENT_NOT_FOUND' });
    expect(complaints.complaints).toHaveLength(0);
  });
});