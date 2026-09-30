import { describe, expect, it } from 'vitest';
import { DraftService } from '../src/draft-service';
import { ImageService } from '../src/image-service';
import { MemoryArticleStore } from '../src/memory-article-store';

const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const media_id = '018f3c2a-7b10-7c3e-8f21-0000000000e1';

describe('article images', () => {
  it('links a ready object and refuses an unknown one', async () => {
    const store = new MemoryArticleStore();
    const opened = await new DraftService(store).open({ author_id });
    const images = new ImageService(store, {
      async findReady(id: string) {
        return id === media_id ? { id } : null;
      },
    });

    const linked = await images.attach({ author_id, article_id: opened.id, media_id });
    expect(linked.images).toEqual([{ media_id, position: 0 }]);

    await expect(
      images.attach({
        author_id,
        article_id: opened.id,
        media_id: '018f3c2a-7b10-7c3e-8f21-0000000000e2',
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_NOT_FOUND' });
    expect(store.articles[0]?.images).toHaveLength(1);
  });
});
