import { describe, expect, it } from 'vitest';
import type { AuthorGate } from '../src/author-gate';
import { ComplaintService } from '../src/complaint-service';
import { DraftService } from '../src/draft-service';
import { MemoryArticleStore } from '../src/memory-article-store';
import { MemoryComplaintStore } from '../src/memory-complaint-store';
import { PublishService } from '../src/publish-service';

const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const reporter_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const category_id = '018f3c2a-7b10-7c3e-8f21-0000000000c1';

const gate: AuthorGate = {
  async hasUsername() {
    return true;
  },
  async isBlocked() {
    return false;
  },
};

async function publishedArticle(store: MemoryArticleStore): Promise<string> {
  const drafts = new DraftService(store);
  const opened = await drafts.open({ author_id });
  await drafts.save({
    author_id,
    article_id: opened.id,
    version: 1,
    editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Visible text' } }] },
  });
  const publish = new PublishService(store, gate);
  await publish.publish({
    author_id,
    article_id: opened.id,
    category_ids: [category_id],
    title: 'Visible',
    language: 'en',
  });
  return opened.id;
}

describe('article complaints', () => {
  it('stores an open complaint a moderator can list and leaves the article published', async () => {
    const articles = new MemoryArticleStore();
    const complaints = new MemoryComplaintStore();
    const article_id = await publishedArticle(articles);
    const service = new ComplaintService(articles, complaints);

    const filed = await service.file({
      article_id,
      reporter_id,
      reason: 'This should be reviewed',
    });

    expect(filed).toMatchObject({
      target_type: 'article',
      target_id: article_id,
      status: 'open',
    });
    const open = await service.listOpen();
    expect(open).toEqual([
      expect.objectContaining({
        id: filed.id,
        article_id,
        reporter_id,
        reason: 'This should be reviewed',
        status: 'open',
      }),
    ]);
    expect((await articles.findById(article_id))?.status).toBe('published');

    await service.dismiss(filed.id, 'Reviewed and kept');
    expect(await service.listOpen()).toEqual([]);
    expect((await articles.findById(article_id))?.status).toBe('published');
  });

  it('refuses a blank reason and does not insert a complaint', async () => {
    const articles = new MemoryArticleStore();
    const complaints = new MemoryComplaintStore();
    const article_id = await publishedArticle(articles);
    const service = new ComplaintService(articles, complaints);

    await expect(
      service.file({ article_id, reporter_id, reason: '   ' }),
    ).rejects.toMatchObject({ code: 'COMPLAINT_REASON_REQUIRED' });
    expect(complaints.complaints).toHaveLength(0);
    expect((await articles.findById(article_id))?.status).toBe('published');
  });
});
