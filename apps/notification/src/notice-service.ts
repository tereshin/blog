import { MemoryNoticeStore } from './memory-notice-store';
import type { Notice, NoticeStore, NoticeType } from './notice-store';
import { uuidV7 } from './uuid-v7';

export type IncomingEvent = {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
};

export class NoticeService {
  now: () => Date = () => new Date();

  constructor(private readonly store: NoticeStore) {}

  async consume(event: IncomingEvent): Promise<void> {
    if (event.eventType === 'comments.comment.created') {
      await this.comment(event);
      return;
    }
    if (event.eventType === 'social.user.followed') {
      await this.one(event, 'follow', 'user', stringField(event.data, 'following_id'), stringField(event.data, 'follower_id'), stringField(event.data, 'follower_id'));
      return;
    }
    if (event.eventType === 'messages.direct_message.sent') {
      await this.one(
        event,
        'direct_message',
        'message',
        stringField(event.data, 'recipient_id'),
        stringField(event.data, 'sender_id'),
        stringField(event.data, 'message_id'),
      );
    }
  }

  async list(user_id: string): Promise<Notice[]> {
    return this.store.list(user_id);
  }

  private async comment(event: IncomingEvent): Promise<void> {
    const author_id = stringField(event.data, 'author_id');
    const parent_author_id = stringField(event.data, 'parent_author_id');
    const comment_id = stringField(event.data, 'comment_id');
    if (parent_author_id && parent_author_id !== author_id) {
      await this.one(event, 'reply', 'comment', parent_author_id, author_id, comment_id);
    }
    const mentioned = Array.isArray(event.data.mentioned_user_ids) ? event.data.mentioned_user_ids : [];
    for (const user_id of mentioned) {
      if (typeof user_id === 'string' && user_id !== author_id) {
        await this.one(event, 'mention', 'comment', user_id, author_id, comment_id);
      }
    }
  }

  private async one(
    event: IncomingEvent,
    type: NoticeType,
    entity_type: Notice['entity_type'],
    user_id: string,
    actor_id: string,
    entity_id: string,
  ): Promise<void> {
    if (!user_id || user_id === actor_id) {
      return;
    }
    await this.store.insert({
      id: uuidV7(this.now().getTime()),
      user_id,
      type,
      actor_id,
      entity_type,
      entity_id,
      source_event_id: event.eventId,
      created_at: this.now().toISOString(),
    });
  }
}

function stringField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

export function channels(store: NoticeStore): { email: number; phone: number } {
  return store instanceof MemoryNoticeStore ? store.channels : { email: 0, phone: 0 };
}
