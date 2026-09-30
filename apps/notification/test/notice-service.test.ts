import { describe, expect, it } from 'vitest';
import { MemoryNoticeStore } from '../src/memory-notice-store';
import { NoticeService } from '../src/notice-service';

const parent_author = '018f3c2a-7b10-7c3e-8f21-0000000000b1';
const mentioned = '018f3c2a-7b10-7c3e-8f21-0000000000b2';
const author_id = '018f3c2a-7b10-7c3e-8f21-0000000000b3';
const follower_id = '018f3c2a-7b10-7c3e-8f21-0000000000b4';
const sender_id = '018f3c2a-7b10-7c3e-8f21-0000000000b5';
const comment_id = '018f3c2a-7b10-7c3e-8f21-0000000000d1';
const message_id = '018f3c2a-7b10-7c3e-8f21-0000000000e1';

describe('notifications', () => {
  it('writes an in-product notice for a reply, a mention, a follow, and a direct message', async () => {
    const store = new MemoryNoticeStore();
    const notices = new NoticeService(store);
    const comment = {
      eventId: '018f3c2a-7b10-7c3e-8f21-0000000000e2',
      eventType: 'comments.comment.created',
      data: { author_id, parent_author_id: parent_author, mentioned_user_ids: [mentioned], comment_id },
    };
    await notices.consume(comment);
    await notices.consume(comment);
    await notices.consume({
      eventId: '018f3c2a-7b10-7c3e-8f21-0000000000e3',
      eventType: 'social.user.followed',
      data: { follower_id, following_id: parent_author },
    });
    await notices.consume({
      eventId: '018f3c2a-7b10-7c3e-8f21-0000000000e4',
      eventType: 'messages.direct_message.sent',
      data: { sender_id, recipient_id: parent_author, message_id },
    });

    const list = await notices.list(parent_author);
    expect(list.map((notice) => notice.type).sort()).toEqual(['direct_message', 'follow', 'reply']);
    expect(await notices.list(mentioned)).toEqual([expect.objectContaining({ type: 'mention' })]);
    expect(store.notices.filter((notice) => notice.source_event_id === comment.eventId && notice.user_id === parent_author)).toHaveLength(1);
    expect(store.channels).toEqual({ email: 0, phone: 0 });
    expect(JSON.stringify(store.notices)).not.toContain('email');
  });
});
