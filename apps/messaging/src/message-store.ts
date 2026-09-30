export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type Conversation = {
  id: string;
  user_id_low: string;
  user_id_high: string;
};

export type SentEvent = {
  id: string;
  event_type: 'messages.direct_message.sent';
  aggregate_id: string;
  payload: { conversation_id: string; message_id: string; sender_id: string; recipient_id: string };
  producer: 'messages';
  event_version: 1;
};

export interface MessageStore {
  findPair(user_id_low: string, user_id_high: string): Promise<Conversation | null>;
  insertConversation(conversation: Conversation): Promise<void>;
  insertMessage(message: DirectMessage, event: SentEvent): Promise<void>;
  listFor(user_id: string): Promise<Conversation[]>;
  listMessages(conversation_id: string): Promise<DirectMessage[]>;
  markRead(conversation_id: string, reader_id: string, read_at: string): Promise<void>;
  isMember(conversation_id: string, user_id: string): Promise<boolean>;
}
