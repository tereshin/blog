import { describe, expect, it } from 'vitest';
import type { AuthorGate } from '../src/author-gate';
import { ComplaintService } from '../src/complaint-service';
import { DraftService } from '../src/draft-service';
import { MemoryArticleStore } from '../src/memory-article-store';
import { MemoryComplaintStore } from '../src/memory-complaint-store';
import { PublishService } from '../src/publish-service';
import type { StaffAudit, StaffAuditAppender } from '../src/staff-audit';
import { StaffArticleService } from '../src/staff-service';

const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const moderator_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const admin_id = '018f3c2a-7b10-7c3e-8f21-000000000001';
const other_id = '018f3c2a-7b10-7c3e-8f21-0000000000b3';
const category_id = '018f3c2a-7b10-7c3e-8f21-0000000000c1';
const next_category = '018f3c2a-7b10-7c3e-8f21-0000000000c2';

const gate: AuthorGate = {
  async hasUsername() { return true; },
  async isBlocked() { return false; },
};

function harness() {
  const articles = new MemoryArticleStore();
  const complaints = new MemoryComplaintStore();
  const audits: StaffAudit[] = [];
  let fail_once = false;
  const audit: StaffAuditAppender = {
    async append(entry) {
      if (fail_once) {
        fail_once = false;
        throw new Error('retry');
      }
      audits.push(entry);
    },
  };
  const staff = new StaffArticleService(articles, complaints, {
    async exists(id) { return id === next_category; },
  }, audit);
  return { articles, complaints, audits, staff, armFailure: () => { fail_once = true; } };
}

async function published(articles: MemoryArticleStore): Promise<string> {
  const drafts = new DraftService(articles);
  const opened = await drafts.open({ author_id });
  await drafts.save({
    author_id,
    article_id: opened.id,
    version: 1,
    editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Visible text' } }] },
  });
  await new PublishService(articles, gate).publish({
    author_id,
    article_id: opened.id,
    category_ids: [category_id],
    title: 'Visible',
    language: 'en',
  });
  return opened.id;
}

describe('staff articles', () => {
  it('hides an article, closes the complaint, and keeps the text for the author', async () => {
    const { articles, complaints, audits, staff, armFailure } = harness();
    const article_id = await published(articles);
    await new ComplaintService(articles, complaints).file({
      article_id,
      reporter_id: other_id,
      reason: 'Review this',
    });
    armFailure();
    await staff.hide({ actor_id: moderator_id, role: 'moderator', article_id, reason: 'Harm' });

    const guest = await new DraftService(articles).read({ viewer_id: null, article_id });
    expect(guest).toEqual({ view: 'unavailable', id: article_id });
    expect(JSON.stringify(guest)).not.toContain('hidden');
    const author = await new DraftService(articles).read({ viewer_id: author_id, article_id });
    expect(author).toMatchObject({ rendered_html: expect.stringContaining('Visible text'), status: 'hidden' });
    expect(await complaints.listOpen()).toEqual([]);
    expect(articles.outbox.at(-1)?.event_type).toBe('content.article.hidden');
    expect(audits).toEqual([
      expect.objectContaining({ action: 'article.hide', reason: 'Harm', actor_id: moderator_id }),
    ]);
    const panel = await staff.staffRead({ role: 'moderator', article_id });
    expect(panel.rendered_html).toContain('Visible text');
  });

  it('refuses a blank reason, lets only an administrator soft-remove, and moves a category without a reason', async () => {
    const { articles, audits, staff } = harness();
    const article_id = await published(articles);
    await expect(
      staff.hide({ actor_id: moderator_id, role: 'moderator', article_id, reason: ' ' }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    expect((await articles.findById(article_id))?.status).toBe('published');

    await expect(
      staff.softRemove({ actor_id: moderator_id, role: 'moderator', article_id, reason: 'Remove' }),
    ).rejects.toMatchObject({ code: 'ADMIN_ONLY' });
    await staff.hide({ actor_id: moderator_id, role: 'moderator', article_id, reason: 'Hide instead' });

    const fresh = await published(articles);
    await staff.softRemove({ actor_id: admin_id, role: 'administrator', article_id: fresh, reason: 'Staff remove' });
    expect(await articles.findById(fresh)).toMatchObject({ status: 'soft_removed', removed_by: 'staff' });
    expect(articles.outbox.at(-1)?.event_type).toBe('content.article.soft_removed');

    const moved = await published(articles);
    await staff.moveCategory({
      actor_id: moderator_id,
      role: 'moderator',
      article_id: moved,
      category_id: next_category,
    });
    expect((await articles.findById(moved))?.category_id).toBe(next_category);
    expect(audits.some((entry) => entry.action === 'article.category.change' && entry.reason === null)).toBe(true);
  });
});
