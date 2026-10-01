import { describe, expect, it } from 'vitest';
import type { ArticleVisibility } from '../src/article-visibility';
import { CommentService } from '../src/comment-service';
import { ComplaintService } from '../src/complaint-service';
import { MemoryCommentStore } from '../src/memory-comment-store';
import { MemoryComplaintStore } from '../src/memory-complaint-store';
import type { CommentAudit } from '../src/staff-audit';
import { StaffCommentService } from '../src/staff-service';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const moderator_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const reporter_id = '018f3c2a-7b10-7c3e-8f21-0000000000b3';

const visible: ArticleVisibility = { async isPublished() { return true; } };

describe('hide a comment', () => {
  it('hides the text from readers, keeps it for the author and staff, and closes the complaint', async () => {
    const comments = new MemoryCommentStore();
    const complaints = new MemoryComplaintStore();
    const audits: CommentAudit[] = [];
    let fail_once = true;
    const comment = await new CommentService(comments, visible).comment({
      article_id,
      author_id,
      body: 'Visible reply',
    });
    await new ComplaintService(comments, complaints).file({
      comment_id: comment.id,
      reporter_id,
      reason: 'Review',
    });
    const staff = new StaffCommentService(comments, complaints, {
      async append(entry) {
        if (fail_once) {
          fail_once = false;
          throw new Error('retry');
        }
        audits.push(entry);
      },
    });

    await staff.hide({ actor_id: moderator_id, role: 'moderator', comment_id: comment.id, reason: 'Harm' });
    const stored = await comments.findById(comment.id);
    expect(stored?.status).toBe('hidden');
    const guest = staff.present(stored!, null);
    expect(guest).toEqual({ view: 'unavailable', id: comment.id });
    expect(JSON.stringify(guest)).not.toContain('hidden');
    expect(staff.present(stored!, author_id)).toMatchObject({ body: 'Visible reply', status: 'hidden' });
    expect((await staff.staffRead({ role: 'moderator', comment_id: comment.id })).body).toBe('Visible reply');
    expect(await complaints.listOpen()).toEqual([]);
    expect(comments.outbox.at(-1)?.event_type).toBe('comments.comment.hidden');
    expect(audits).toEqual([expect.objectContaining({ action: 'comment.hide', reason: 'Harm' })]);
  });

  it('refuses a blank reason and leaves the comment visible', async () => {
    const comments = new MemoryCommentStore();
    const complaints = new MemoryComplaintStore();
    const comment = await new CommentService(comments, visible).comment({
      article_id,
      author_id,
      body: 'Still visible',
    });
    const staff = new StaffCommentService(comments, complaints, { async append() {} });
    await expect(
      staff.hide({ actor_id: moderator_id, role: 'moderator', comment_id: comment.id, reason: '  ' }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    expect((await comments.findById(comment.id))?.status).toBe('visible');
  });
});
