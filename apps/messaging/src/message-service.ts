import { MessageError } from './message-error';
import type { Conversation, DirectMessage, MessageStore } from './message-store';
import { uuidV7 } from './uuid-v7';

export interface SenderAccess {
  isBlocked(user_id: string): Promise<boolean>;
}

export class MessageService {
  now: () => Date = () => new Date();

  constructor(
    private readonly store: MessageStore,
    private readonly access: SenderAccess,
  ) {}

  async send(input: { sender_id: string | null; peer_id: string; body: string }) {
    const sender_id = this.requireUser(input.sender_id);
    const body = this.requireBody(input.body);
    if (await this.access.isBlocked(sender_id)) {
      throw new MessageError('ACCOUNT_BLOCKED');
    }
    const conversation = await this.pair(sender_id, input.peer_id);
    return this.append(conversation, sender_id, input.peer_id, body);
  }

  async reply(input: { sender_id: string | null; conversation_id: string; body: string }) {
    const sender_id = this.requireUser(input.sender_id);
    const body = this.requireBody(input.body);
    if (await this.access.isBlocked(sender_id)) {
      throw new MessageError('ACCOUNT_BLOCKED');
    }
    const conversation = await this.requireMember(input.conversation_id, sender_id);
    const peer_id = conversation.user_id_low === sender_id ? conversation.user_id_high : conversation.user_id_low;
    return this.append(conversation, sender_id, peer_id, body);
  }

  async list(user_id: string | null) {
    const caller = this.requireUser(user_id);
    const conversations = await this.store.listFor(caller);
    const items = [];
    for (const conversation of conversations) {
      const messages = await this.store.listMessages(conversation.id);
      items.push({
        id: conversation.id,
        peer_user_id: conversation.user_id_low === caller ? conversation.user_id_high : conversation.user_id_low,
        unread_count: messages.filter((message) => message.sender_id !== caller && !message.read_at).length,
      });
    }
    return { items, has_next: false, has_prev: false, next_cursor: null };
  }

  async thread(user_id: string | null, conversation_id: string): Promise<DirectMessage[]> {
    const caller = this.requireUser(user_id);
    await this.requireMember(conversation_id, caller);
    return this.store.listMessages(conversation_id);
  }

  async markRead(user_id: string | null, conversation_id: string): Promise<{ read_at: string }> {
    const caller = this.requireUser(user_id);
    await this.requireMember(conversation_id, caller);
    const read_at = this.now().toISOString();
    await this.store.markRead(conversation_id, caller, read_at);
    return { read_at };
  }

  private async pair(left: string, right: string): Promise<Conversation> {
    const [user_id_low, user_id_high] = [left, right].sort();
    const existing = await this.store.findPair(user_id_low ?? left, user_id_high ?? right);
    if (existing) {
      return existing;
    }
    const conversation = { id: uuidV7(this.now().getTime()), user_id_low: user_id_low ?? left, user_id_high: user_id_high ?? right };
    await this.store.insertConversation(conversation);
    return conversation;
  }

  private async append(conversation: Conversation, sender_id: string, recipient_id: string, body: string) {
    const message: DirectMessage = {
      id: uuidV7(this.now().getTime()),
      conversation_id: conversation.id,
      sender_id,
      body,
      created_at: this.now().toISOString(),
      read_at: null,
    };
    await this.store.insertMessage(message, {
      id: uuidV7(this.now().getTime()),
      event_type: 'messages.direct_message.sent',
      aggregate_id: message.id,
      payload: { conversation_id: conversation.id, message_id: message.id, sender_id, recipient_id },
      producer: 'messages',
      event_version: 1,
    });
    return message;
  }

  private requireUser(user_id: string | null): string {
    if (!user_id) {
      throw new MessageError('AUTH_REQUIRED');
    }
    return user_id;
  }

  private requireBody(body: string): string {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      throw new MessageError('MESSAGE_BODY_REQUIRED');
    }
    return trimmed;
  }

  private async requireMember(conversation_id: string, user_id: string): Promise<Conversation> {
    if (!(await this.store.isMember(conversation_id, user_id))) {
      throw new MessageError('CONVERSATION_NOT_FOUND');
    }
    const conversations = await this.store.listFor(user_id);
    const conversation = conversations.find((row) => row.id === conversation_id);
    if (!conversation) {
      throw new MessageError('CONVERSATION_NOT_FOUND');
    }
    return conversation;
  }
}
