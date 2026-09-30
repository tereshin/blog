import { describe, expect, it } from 'vitest';
import type { AuthorGate } from '../src/author-gate';
import { DraftService } from '../src/draft-service';
import { MemoryArticleStore } from '../src/memory-article-store';
import { PublishService } from '../src/publish-service';

const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const category_id = '018f3c2a-7b10-7c3e-8f21-0000000000c1';

function gate(options: { username?: boolean; blocked?: boolean } = {}): AuthorGate {
  return {
    async hasUsername() {
      return options.username ?? true;
    },
    async isBlocked() {
      return options.blocked ?? false;
    },
  };
}

async function readyDraft(store: MemoryArticleStore): Promise<string> {
  const drafts = new DraftService(store);
  const opened = await drafts.open({ author_id });
  await drafts.save({
    author_id,
    article_id: opened.id,
    version: 1,
    editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Published text' } }] },
  });
  return opened.id;
}

describe('publish and withdraw', () => {
  it('publishes one category, a title, text, and a language with no image', async () => {
    const store = new MemoryArticleStore();
    const article_id = await readyDraft(store);
    const publish = new PublishService(store, gate());

    const published = await publish.publish({
      author_id,
      article_id,
      category_ids: [category_id],
      title: 'Test Article',
      language: 'en',
    });

    expect(published.status).toBe('published');
    expect(published.rendered_html).toContain('Published text');
    expect(published.images).toEqual([]);
    expect(store.outbox.map((event) => event.event_type)).toEqual(['article.published']);

    const guest = await new DraftService(store).read({ viewer_id: null, article_id });
    expect(guest).toMatchObject({ status: 'published', rendered_html: expect.stringContaining('Published text') });
  });

  it('blocks publication when the category, title, text, or username is missing', async () => {
    const store = new MemoryArticleStore();
    const article_id = await readyDraft(store);
    const publish = new PublishService(store, gate());

    await expect(
      publish.publish({
        author_id,
        article_id,
        category_ids: [],
        title: 'Test Article',
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_CATEGORY_REQUIRED' });

    await expect(
      publish.publish({
        author_id,
        article_id,
        category_ids: [category_id, category_id],
        title: 'Test Article',
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_CATEGORY_REQUIRED' });

    await expect(
      publish.publish({
        author_id,
        article_id,
        category_ids: [category_id],
        title: '  ',
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_TITLE_REQUIRED' });

    await expect(
      publish.publish({
        author_id,
        article_id,
        category_ids: [category_id],
        title: 'Test Article',
        language: null,
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_LANGUAGE_REQUIRED' });

    const empty = new MemoryArticleStore();
    const empty_id = (await new DraftService(empty).open({ author_id })).id;
    await expect(
      new PublishService(empty, gate()).publish({
        author_id,
        article_id: empty_id,
        category_ids: [category_id],
        title: 'Test Article',
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_TEXT_REQUIRED' });

    await expect(
      new PublishService(store, gate({ username: false })).publish({
        author_id,
        article_id,
        category_ids: [category_id],
        title: 'Test Article',
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'USERNAME_REQUIRED' });
    expect(store.articles.find((row) => row.id === article_id)?.status).toBe('draft');
  });

  it('refuses a new publish while blocked and leaves the published article visible', async () => {
    const store = new MemoryArticleStore();
    const article_id = await readyDraft(store);
    await new PublishService(store, gate()).publish({
      author_id,
      article_id,
      category_ids: [category_id],
      title: 'Test Article',
      language: 'en',
    });
    const second_id = await readyDraft(store);

    await expect(
      new PublishService(store, gate({ blocked: true })).publish({
        author_id,
        article_id: second_id,
        category_ids: [category_id],
        title: 'Second',
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED' });

    const guest = await new DraftService(store).read({ viewer_id: null, article_id });
    expect(guest).toMatchObject({ status: 'published' });
  });

  it('lets the author withdraw and hides the text from everyone else', async () => {
    const store = new MemoryArticleStore();
    const article_id = await readyDraft(store);
    const publish = new PublishService(store, gate());
    await publish.publish({
      author_id,
      article_id,
      category_ids: [category_id],
      title: 'Test Article',
      language: 'en',
    });

    await expect(
      publish.withdraw({ author_id: '018f3c2a-7b10-7c3e-8f21-0000000000d1', article_id }),
    ).rejects.toMatchObject({ code: 'ARTICLE_NOT_OWNED' });

    const withdrawn = await publish.withdraw({ author_id, article_id });
    expect(withdrawn.status).toBe('soft_removed');
    expect(withdrawn.removed_by).toBe('author');
    expect(withdrawn.status).not.toBe('hidden');

    const guest = await new DraftService(store).read({ viewer_id: null, article_id });
    expect(guest).toEqual({ view: 'unavailable', id: article_id });
    expect(JSON.stringify(guest)).not.toContain('Published text');

    const author = await new DraftService(store).read({ viewer_id: author_id, article_id });
    expect(author).toMatchObject({
      status: 'soft_removed',
      removed_by: 'author',
      rendered_html: expect.stringContaining('Published text'),
    });
  });
});
