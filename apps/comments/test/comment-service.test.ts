import { describe, expect, it } from 'vitest';
import type { ArticleVisibility } from '../src/article-visibility';
import { CommentService } from '../src/comment-service';
import { MemoryCommentStore } from '../src/memory-comment-store';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const first_user = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const second_user = '018f3c2a-7b10-7c3e-8f21-0000000000b2';

function articles(published: boolean): ArticleVisibility {
  return {
    async isPublished() {
      return published;
    },
  };
}

describe('comments', () => {
  it('keeps a reply under the comment, flattens depth past 3, and stores the mention', async () => {
    const store = new MemoryCommentStore();
    const comments = new CommentService(store, articles(true));
    const top = await comments.comment({
      article_id,
      author_id: first_user,
      body: 'Hello',
    });
    const reply = await comments.reply({
      comment_id: top.id,
      author_id: second_user,
      body: 'Reply',
      mentioned_user_ids: [first_user],
    });

    expect(reply.parent_id).toBe(top.id);
    expect(reply.root_id).toBe(top.id);
    expect(reply.depth).toBe(2);
    expect(reply.mentioned_user_ids).toEqual([first_user]);
    expect(reply.flat).toBe(false);

    let parent_id = reply.id;
    let deep = reply;
    for (let step = 0; step < 2; step += 1) {
      deep = await comments.reply({
        comment_id: parent_id,
        author_id: first_user,
        body: `Level ${step + 3}`,
      });
      parent_id = deep.id;
    }

    expect(deep.depth).toBe(4);
    expect(deep.flat).toBe(true);
    expect(deep.parent_id).not.toBeNull();
    expect(store.outbox[1]?.payload.mentioned_user_ids).toEqual([first_user]);
    expect(store.outbox[0]?.event_type).toBe('comments.comment.created');
    expect(store.content_writes).toEqual([]);
  });

  it('refuses a comment on an article readers cannot see and an empty body', async () => {
    const store = new MemoryCommentStore();
    const hidden = new CommentService(store, articles(false));

    await expect(
      hidden.comment({ article_id, author_id: first_user, body: 'Nope' }),
    ).rejects.toMatchObject({ code: 'COMMENT_ARTICLE_NOT_VISIBLE' });

    const visible = new CommentService(store, articles(true));
    await expect(
      visible.comment({ article_id, author_id: first_user, body: '   ' }),
    ).rejects.toMatchObject({ code: 'COMMENT_BODY_REQUIRED' });
    expect(store.comments).toHaveLength(0);
  });
});
