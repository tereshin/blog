import type { Conversation, DirectMessage, MessageStore, SentEvent } from './message-store';

export class MemoryMessageStore implements MessageStore {
  readonly conversations: Conversation[] = [];
  readonly messages: DirectMessage[] = [];
  readonly outbox: SentEvent[] = [];

  async findPair(user_id_low: string, user_id_high: string): Promise<Conversation | null> {
    return (
      this.conversations.find(
        (conversation) => conversation.user_id_low === user_id_low && conversation.user_id_high === user_id_high,
      ) ?? null
    );
  }

  async insertConversation(conversation: Conversation): Promise<void> {
    this.conversations.push(conversation);
  }

  async insertMessage(message: DirectMessage, event: SentEvent): Promise<void> {
    this.messages.push(message);
    this.outbox.push(event);
  }

  async listFor(user_id: string): Promise<Conversation[]> {
    return this.conversations.filter(
      (conversation) => conversation.user_id_low === user_id || conversation.user_id_high === user_id,
    );
  }

  async listMessages(conversation_id: string): Promise<DirectMessage[]> {
    return this.messages.filter((message) => message.conversation_id === conversation_id);
  }

  async markRead(conversation_id: string, reader_id: string, read_at: string): Promise<void> {
    for (const message of this.messages) {
      if (message.conversation_id === conversation_id && message.sender_id !== reader_id && !message.read_at) {
        message.read_at = read_at;
      }
    }
  }

  async isMember(conversation_id: string, user_id: string): Promise<boolean> {
    const conversation = this.conversations.find((row) => row.id === conversation_id);
    return conversation?.user_id_low === user_id || conversation?.user_id_high === user_id;
  }
}
