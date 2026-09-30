export type NoticeType = 'reply' | 'mention' | 'follow' | 'direct_message';

export type Notice = {
  id: string;
  user_id: string;
  type: NoticeType;
  actor_id: string;
  entity_type: 'comment' | 'user' | 'message';
  entity_id: string;
  source_event_id: string;
  created_at: string;
};

export interface NoticeStore {
  insert(notice: Notice): Promise<boolean>;
  list(user_id: string): Promise<Notice[]>;
}
