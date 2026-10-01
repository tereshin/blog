import { describe, expect, it } from 'vitest';
import {
  type ComplaintAuditAppender,
  type ComplaintDesk,
  type ComplaintView,
  ComplaintReviewError,
  ComplaintReviewService,
} from '../src/complaints/complaint-review';

const actor_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const comment_id = '018f3c2a-7b10-7c3e-8f21-0000000000c1';

class MemoryDesk implements ComplaintDesk {
  readonly visible = new Map<string, boolean>();

  constructor(private readonly rows: ComplaintView[]) {
    for (const row of rows) {
      this.visible.set(row.target_id, true);
    }
  }

  async listOpen(): Promise<ComplaintView[]> {
    return this.rows.filter((row) => row.status === 'open');
  }

  async dismiss(complaint_id: string, reason: string): Promise<ComplaintView | null> {
    const row = this.rows.find((item) => item.id === complaint_id && item.status === 'open');
    if (!row) {
      return null;
    }
    row.status = 'dismissed';
    row.resolution_reason = reason;
    return row;
  }
}

class MemoryAudit implements ComplaintAuditAppender {
  readonly entries: Array<{ action: string; actor_id: string; entity_id: string; reason: string }> = [];
  failures_left = 0;

  async append(entry: {
    action: 'complaint.dismiss';
    actor_id: string;
    entity_id: string;
    reason: string;
  }): Promise<void> {
    if (this.failures_left > 0) {
      this.failures_left -= 1;
      throw new Error('audit down');
    }
    this.entries.push(entry);
  }
}

function openComplaint(target_type: 'article' | 'comment', target_id: string): ComplaintView {
  return {
    id: target_type === 'article' ? '018f3c2a-7b10-7c3e-8f21-0000000000d1' : '018f3c2a-7b10-7c3e-8f21-0000000000d2',
    target_type,
    target_id,
    reporter_id: '018f3c2a-7b10-7c3e-8f21-0000000000e1',
    reason: 'Needs a look',
    status: 'open',
    created_at: '2026-09-30T12:00:00Z',
  };
}

describe('complaint review', () => {
  it('dismisses an open complaint, keeps the target visible, and audits the reason', async () => {
    const article_complaint = openComplaint('article', article_id);
    const articles = new MemoryDesk([article_complaint]);
    const comments = new MemoryDesk([openComplaint('comment', comment_id)]);
    const audit = new MemoryAudit();
    audit.failures_left = 1;
    const review = new ComplaintReviewService(articles, comments, audit);

    const page = await review.listOpen();
    expect(page.items).toHaveLength(2);

    const dismissed = await review.dismiss({
      complaint_id: article_complaint.id,
      target_type: 'article',
      reason: 'Kept the article',
      actor_id,
      role: 'moderator',
    });

    expect(dismissed.status).toBe('dismissed');
    expect(dismissed.resolution_reason).toBe('Kept the article');
    expect(articles.visible.get(article_id)).toBe(true);
    expect((await review.listOpen()).items.map((row) => row.target_type)).toEqual(['comment']);
    expect(audit.entries).toEqual([
      {
        action: 'complaint.dismiss',
        actor_id,
        entity_id: dismissed.id,
        reason: 'Kept the article',
      },
    ]);
  });

  it('blocks a blank reason and leaves the complaint open', async () => {
    const articles = new MemoryDesk([openComplaint('article', article_id)]);
    const comments = new MemoryDesk([]);
    const audit = new MemoryAudit();
    const review = new ComplaintReviewService(articles, comments, audit);

    await expect(
      review.dismiss({
        complaint_id: '018f3c2a-7b10-7c3e-8f21-0000000000d1',
        target_type: 'article',
        reason: '   ',
        actor_id,
        role: 'administrator',
      }),
    ).rejects.toBeInstanceOf(ComplaintReviewError);
    expect((await review.listOpen()).items).toHaveLength(1);
    expect(audit.entries).toEqual([]);
  });
});
