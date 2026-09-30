import { describe, expect, it } from 'vitest';
import type { AccountAccess, KnownComments, PublishedArticles } from '../src/engagement-ports';
import { MemoryViewWindow } from '../src/engagement-ports';
import { EngagementService } from '../src/engagement-service';
import { MemoryEngagementStore } from '../src/memory-engagement-store';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const comment_id = '018f3c2a-7b10-7c3e-8f21-0000000000d1';
const user_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const other_user = '018f3c2a-7b10-7c3e-8f21-0000000000b2';

function service(options: { published?: boolean; blocked?: boolean; comment?: boolean } = {}) {
  const store = new MemoryEngagementStore();
  const views = new MemoryViewWindow();
  const articles: PublishedArticles = { async isPublished() { return options.published ?? true; } };
  const comments: KnownComments = { async exists() { return options.comment ?? true; } };
  const accounts: AccountAccess = { async isBlocked() { return options.blocked ?? false; } };
  return { store, views, engagement: new EngagementService(store, articles, comments, accounts, views) };
}

describe('engagement', () => {
  it('raises the like count once and lowers it on the second like', async () => {
    const { engagement, store } = service();
    const first = await engagement.likeArticle({ user_id, article_id });
    const second = await engagement.likeArticle({ user_id, article_id });
    expect(first).toEqual({ liked: true, like_count: 1 });
    expect(second).toEqual({ liked: false, like_count: 0 });
    expect(store.outbox.map((event) => event.event_type)).toEqual([
      'engagement.article.liked',
      'engagement.article.unliked',
    ]);
    expect(store.content_writes).toEqual([]);
  });

  it('likes a comment and can take that like back', async () => {
    const { engagement } = service();
    expect(await engagement.likeComment({ user_id, comment_id })).toEqual({ liked: true, like_count: 1 });
    expect(await engagement.likeComment({ user_id, comment_id })).toEqual({ liked: false, like_count: 0 });
  });

  it('shows a bookmark only to the user who saved it', async () => {
    const { engagement, store } = service();
    await engagement.bookmark({ user_id, article_id });
    expect(await engagement.listBookmarks(user_id)).toEqual([article_id]);
    expect(await engagement.listBookmarks(other_user)).toEqual([]);
    await expect(engagement.listBookmarks(null)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    await engagement.removeBookmark({ user_id, article_id });
    expect(await engagement.listBookmarks(user_id)).toEqual([]);
    expect(store.outbox).toHaveLength(0);
  });

  it('counts one view per viewer for 30 minutes and a new guest session separately', async () => {
    const { engagement, views } = service();
    const now = new Date('2026-09-30T12:00:00Z');
    engagement.now = () => now;
    expect(await engagement.recordView({ article_id, user_id, viewer_key: null })).toEqual({ recorded: true });
    expect(await engagement.recordView({ article_id, user_id, viewer_key: null })).toEqual({ recorded: false });
    expect(await engagement.recordView({ article_id, user_id: null, viewer_key: 'session-a' })).toEqual({
      recorded: true,
    });
    expect(await engagement.recordView({ article_id, user_id: null, viewer_key: 'session-a' })).toEqual({
      recorded: false,
    });
    expect(await engagement.recordView({ article_id, user_id: null, viewer_key: 'session-b' })).toEqual({
      recorded: true,
    });
    expect(views.pending.get(`pending:${article_id}`)?.count).toBe(3);
  });
});
