import { verifyAccessToken, type TokenVerifier } from '@blog/firebase';

export type LiveEvent = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  timestamp: string;
  producer: string;
  correlationId: string | null;
  causationId: string | null;
  data: Record<string, unknown>;
};

export type LivePush = {
  socket_id: string;
  event_id: string;
  body: Record<string, unknown>;
};

export class LiveHub {
  private readonly article_rooms = new Map<string, Set<string>>();
  private readonly conversation_rooms = new Map<string, Set<string>>();
  private readonly sent = new Set<string>();

  joinArticle(article_id: string, socket_id: string): void {
    const room = this.article_rooms.get(article_id) ?? new Set<string>();
    room.add(socket_id);
    this.article_rooms.set(article_id, room);
  }

  joinConversation(conversation_id: string, user_id: string): void {
    const room = this.conversation_rooms.get(conversation_id) ?? new Set<string>();
    room.add(user_id);
    this.conversation_rooms.set(conversation_id, room);
  }

  async admitConversation(input: {
    token: string | undefined;
    verify: TokenVerifier;
    conversation_id: string;
    user_id: string;
    member_ids: string[];
  }): Promise<boolean> {
    try {
      await verifyAccessToken(input.token, input.verify);
    } catch {
      return false;
    }
    if (!input.member_ids.includes(input.user_id)) {
      return false;
    }
    this.joinConversation(input.conversation_id, input.user_id);
    return true;
  }

  consume(event: LiveEvent): LivePush[] {
    if (this.sent.has(event.eventId)) {
      return [];
    }
    if (event.eventType.includes('view') || event.eventType === 'content.article.published') {
      return [];
    }
    const pushes = this.route(event);
    if (pushes.length === 0) {
      return [];
    }
    this.sent.add(event.eventId);
    return pushes;
  }

  private route(event: LiveEvent): LivePush[] {
    if (event.eventType === 'messages.direct_message.sent') {
      const conversation_id = String(event.data.conversation_id ?? '');
      const sockets = this.conversation_rooms.get(conversation_id) ?? new Set<string>();
      return [...sockets].map((socket_id) => ({
        socket_id,
        event_id: event.eventId,
        body: {
          conversation_id,
          sender_id: event.data.sender_id,
          recipient_id: event.data.recipient_id,
        },
      }));
    }
    const article_id = String(event.data.article_id ?? '');
    const sockets = this.article_rooms.get(article_id) ?? new Set<string>();
    const body = articleBody(event);
    if (!body) {
      return [];
    }
    return [...sockets].map((socket_id) => ({
      socket_id,
      event_id: event.eventId,
      body,
    }));
  }
}

function articleBody(event: LiveEvent): Record<string, unknown> | null {
  if (event.eventType === 'engagement.article.liked' || event.eventType === 'engagement.article.unliked') {
    return { like_count: event.data.like_count };
  }
  if (event.eventType === 'comments.comment.created') {
    return { comment_id: event.data.comment_id, article_id: event.data.article_id };
  }
  if (event.eventType === 'comments.comment.hidden') {
    return { comment_id: event.data.comment_id, view: 'unavailable' };
  }
  if (event.eventType === 'content.article.hidden' || event.eventType === 'content.article.soft_removed') {
    return { article_id: event.data.article_id, view: 'unavailable' };
  }
  return null;
}
