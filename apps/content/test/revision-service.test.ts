import { describe, expect, it } from 'vitest';
import type { AuthorGate } from '../src/author-gate';
import { content_routes } from '../src/content.module';
import { DraftService } from '../src/draft-service';
import { MemoryArticleStore } from '../src/memory-article-store';
import { PublishService } from '../src/publish-service';

const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const category_id = '018f3c2a-7b10-7c3e-8f21-0000000000c1';

const authors: AuthorGate = {
  async hasUsername() {
    return true;
  },
  async isBlocked() {
    return false;
  },
};

describe('article revisions', () => {
  it('keeps the previous text when a published article is saved', async () => {
    const store = new MemoryArticleStore();
    const drafts = new DraftService(store);
    const opened = await drafts.open({ author_id });
    const saved = await drafts.save({
      author_id,
      article_id: opened.id,
      version: 1,
      title: 'First title',
      editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Old text' } }] },
    });
    await new PublishService(store, authors).publish({
      author_id,
      article_id: opened.id,
      category_ids: [category_id],
      title: 'First title',
      language: 'en',
    });

    const revised = await drafts.save({
      author_id,
      article_id: opened.id,
      version: saved.version,
      title: 'Second title',
      editor_json: { blocks: [{ type: 'paragraph', data: { text: 'New text' } }] },
    });

    expect(revised.rendered_html).toContain('New text');
    expect(store.revisions).toHaveLength(1);
    expect(store.revisions[0]?.rendered_html).toContain('Old text');
    expect(store.revisions[0]?.title).toBe('First title');
    expect(store.outbox.map((event) => event.event_type)).toContain('content.article.revised');
    expect(content_routes.join(' ')).not.toContain('revision');

    await expect(
      drafts.save({
        author_id,
        article_id: opened.id,
        version: saved.version,
        editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Stale' } }] },
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_VERSION_CONFLICT' });
    expect(store.revisions).toHaveLength(1);
  });
});