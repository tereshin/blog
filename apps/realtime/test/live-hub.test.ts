import { describe, expect, it } from 'vitest';
import { LiveHub, type LiveEvent } from '../src/live-hub';

const article_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const comment_id = '018f3c2a-7b10-7c3e-8f21-0000000000d1';
const conversation_id = '018f3c2a-7b10-7c3e-8f21-0000000000e1';
const member_a = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const member_b = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const outsider = '018f3c2a-7b10-7c3e-8f21-0000000000b3';

function event(partial: Partial<LiveEvent> & Pick<LiveEvent, 'eventId' | 'eventType' | 'data'>): LiveEvent {
  return {
    eventVersion: 1,
    timestamp: '2026-09-30T00:00:00.000Z',
    producer: 'content',
    correlationId: null,
    causationId: null,
    ...partial,
  };
}

describe('live updates', () => {
  it('pushes a like, a comment, and a hide to the article room, and a message only to the pair', () => {
    const hub = new LiveHub();
    hub.joinArticle(article_id, 'guest');
    hub.joinArticle(article_id, 'user');
    hub.joinConversation(conversation_id, member_a);
    hub.joinConversation(conversation_id, member_b);

    const like = hub.consume(event({
      eventId: '018f3c2a-7b10-7c3e-8f21-000000000101',
      eventType: 'engagement.article.liked',
      producer: 'engagement',
      data: { article_id, like_count: 2 },
    }));
    const comment = hub.consume(event({
      eventId: '018f3c2a-7b10-7c3e-8f21-000000000102',
      eventType: 'comments.comment.created',
      producer: 'comments',
      data: { article_id, comment_id },
    }));
    const hide = hub.consume(event({
      eventId: '018f3c2a-7b10-7c3e-8f21-000000000103',
      eventType: 'content.article.hidden',
      data: { article_id },
    }));
    const message = hub.consume(event({
      eventId: '018f3c2a-7b10-7c3e-8f21-000000000104',
      eventType: 'messages.direct_message.sent',
      producer: 'messaging',
      data: { conversation_id, sender_id: member_a, recipient_id: member_b },
    }));
    const view = hub.consume(event({
      eventId: '018f3c2a-7b10-7c3e-8f21-000000000105',
      eventType: 'engagement.article.viewed',
      producer: 'engagement',
      data: { article_id, view_count: 9 },
    }));
    const published = hub.consume(event({
      eventId: '018f3c2a-7b10-7c3e-8f21-000000000106',
      eventType: 'content.article.published',
      data: { article_id },
    }));
    const again = hub.consume(event({
      eventId: '018f3c2a-7b10-7c3e-8f21-000000000101',
      eventType: 'engagement.article.liked',
      producer: 'engagement',
      data: { article_id, like_count: 2 },
    }));

    expect(like.map((push) => push.socket_id).sort()).toEqual(['guest', 'user']);
    expect(like[0]?.body).toMatchObject({ like_count: 2 });
    expect(comment[0]?.body).toMatchObject({ comment_id });
    expect(hide[0]?.body).toMatchObject({ view: 'unavailable' });
    expect(message.map((push) => push.socket_id).sort()).toEqual([member_a, member_b]);
    expect(message.some((push) => push.socket_id === outsider)).toBe(false);
    expect(view).toEqual([]);
    expect(published).toEqual([]);
    expect(again).toEqual([]);
  });

  it('does not join a conversation when the socket token is rejected', async () => {
    const hub = new LiveHub();
    const joined = await hub.admitConversation({
      token: 'nope',
      verify: async () => {
        throw new Error('rejected');
      },
      conversation_id,
      user_id: outsider,
      member_ids: [member_a, member_b],
    });

    expect(joined).toBe(false);
  });
});
