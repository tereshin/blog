import { describe, expect, it } from 'vitest';
import { MemoryHitWindow } from '../src/rate-limit/hit-window';
import { SlidingWindowLimiter } from '../src/rate-limit/sliding-window';
import {
  type ArticleCatalog,
  type ArticleSourceRow,
  type GuestAction,
  PublicArticleService,
  PublicReadError,
} from '../src/public/public-article';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';

const published: ArticleSourceRow = {
  view: 'published',
  id: article_id,
  slug: 'test-article',
  title: 'Test Article',
  language: 'en',
  category_id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
  author_id,
  rendered_html: '<p>Test Article</p>',
  images: [{ media_id: '018f3c2a-7b10-7c3e-8f21-0000000000f1', position: 0, url: 'https://media.local/a' }],
};

function service(catalog: ArticleCatalog, commands: GuestAction[] = []) {
  let tick = 1_000;
  const articles = new PublicArticleService(
    catalog,
    { async find(user_id) { return { id: user_id, username: 'test-user' }; } },
    {
      async list() {
        return {
          items: [{ id: '018f3c2a-7b10-7c3e-8f21-0000000000d1', body: 'A comment' }],
          has_next: false,
          has_prev: false,
          next_cursor: null,
        };
      },
    },
    {
      async counts() {
        return {
          like_count: 1,
          comment_count: 1,
          view_count: 3,
          liked_by_viewer: false,
          bookmarked_by_viewer: false,
        };
      },
    },
    new SlidingWindowLimiter({ async find() { return { max_count: 60, window_seconds: 60 }; } }, new MemoryHitWindow()),
    {
      async run(action) {
        commands.push(action);
      },
    },
  );
  articles.now = () => {
    tick += 12;
    return tick;
  };
  return articles;
}

describe('public article read', () => {
  it('composes text, images, comments, and counts for a guest', async () => {
    const articles = service({
      async findBySlug() {
        return published;
      },
      async findById() {
        return null;
      },
    });

    const body = await articles.readBySlug({ slug: 'test-article', user_id: '', visitor: 'guest-1' });

    expect(body).toMatchObject({
      view: 'published',
      rendered_html: '<p>Test Article</p>',
      images: [{ url: 'https://media.local/a' }],
      like_count: 1,
      comment_count: 1,
      view_count: 3,
      author: { username: 'test-user' },
      comments: { items: [{ body: 'A comment' }] },
    });
    expect(body).not.toHaveProperty('liked_by_viewer');
    expect(articles.last_elapsed_ms).toBeGreaterThan(0);
  });

  it('refuses a guest like before the command runs', async () => {
    const commands: GuestAction[] = [];
    const articles = service(
      {
        async findBySlug() {
          return published;
        },
        async findById() {
          return null;
        },
      },
      commands,
    );

    await expect(articles.write({ user_id: '', action: 'like' })).rejects.toBeInstanceOf(PublicReadError);
    expect(commands).toEqual([]);
  });

  it('returns an unavailable payload with no text for a hidden article', async () => {
    const articles = service({
      async findBySlug() {
        return { view: 'unavailable', id: article_id, rendered_html: '<p>hidden</p>' };
      },
      async findById() {
        return null;
      },
    });

    const body = await articles.readBySlug({ slug: 'test-article', user_id: '', visitor: 'guest-1' });
    expect(body).toEqual({ view: 'unavailable', id: article_id });
  });
});
