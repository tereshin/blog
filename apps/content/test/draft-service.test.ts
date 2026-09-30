import { describe, expect, it } from 'vitest';
import { DraftService } from '../src/draft-service';
import { MemoryArticleStore } from '../src/memory-article-store';

const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const other_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';

describe('article drafts', () => {
  it('keeps the draft while the author types and previews the same text', async () => {
    const drafts = new DraftService(new MemoryArticleStore());
    const opened = await drafts.open({ author_id });
    const saved = await drafts.save({
      author_id,
      article_id: opened.id,
      version: opened.version,
      editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Hello draft' } }] },
    });

    expect(saved.rendered_html).toContain('Hello draft');
    expect(saved.editor_json).toEqual({
      blocks: [{ type: 'paragraph', data: { text: 'Hello draft' } }],
    });
    expect(saved.version).toBe(2);
    expect(saved.status).toBe('draft');
  });

  it('does not write a stale version', async () => {
    const store = new MemoryArticleStore();
    const drafts = new DraftService(store);
    const opened = await drafts.open({ author_id });
    await drafts.save({
      author_id,
      article_id: opened.id,
      version: 1,
      editor_json: { blocks: [{ type: 'paragraph', data: { text: 'First' } }] },
    });

    await expect(
      drafts.save({
        author_id,
        article_id: opened.id,
        version: 1,
        editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Stale' } }] },
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_VERSION_CONFLICT', params: { serverVersion: 2 } });

    const author_view = await drafts.read({ viewer_id: author_id, article_id: opened.id });
    expect(author_view).toMatchObject({ rendered_html: expect.stringContaining('First') });
  });

  it('refuses another user and hides the draft text from them', async () => {
    const drafts = new DraftService(new MemoryArticleStore());
    const opened = await drafts.open({ author_id });
    await drafts.save({
      author_id,
      article_id: opened.id,
      version: 1,
      editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Secret draft' } }] },
    });

    await expect(
      drafts.save({
        author_id: other_id,
        article_id: opened.id,
        version: 2,
        editor_json: { blocks: [{ type: 'paragraph', data: { text: 'Nope' } }] },
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_NOT_OWNED' });

    const guest = await drafts.read({ viewer_id: null, article_id: opened.id });
    expect(guest).toEqual({ view: 'unavailable', id: opened.id });
    expect(JSON.stringify(guest)).not.toContain('Secret');
    expect(JSON.stringify(guest)).not.toContain('draft');

    const stranger = await drafts.read({ viewer_id: other_id, article_id: opened.id });
    expect(stranger).toEqual({ view: 'unavailable', id: opened.id });

    const author = await drafts.read({ viewer_id: author_id, article_id: opened.id });
    expect(author).toMatchObject({ status: 'draft', editor_json: expect.anything() });
  });

  it('rejects an embed block and leaves the draft unchanged', async () => {
    const drafts = new DraftService(new MemoryArticleStore());
    const opened = await drafts.open({ author_id });

    await expect(
      drafts.save({
        author_id,
        article_id: opened.id,
        version: 1,
        editor_json: {
          blocks: [
            { type: 'paragraph', data: { text: 'Keep' } },
            { type: 'embed', data: { source: 'https://example.test' } },
          ],
        },
      }),
    ).rejects.toMatchObject({ code: 'ARTICLE_BLOCK_REJECTED' });

    const author = await drafts.read({ viewer_id: author_id, article_id: opened.id });
    expect(author).toMatchObject({ version: 1, rendered_html: '' });
  });
});
