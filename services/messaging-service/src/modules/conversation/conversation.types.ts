import type { ConversationCursor } from './conversation.schema.ts'

export type UserCopy = {
  user_id: string
  display_name?: string | null
  avatar_url?: string | null
  slug?: string | null
  is_restricted?: boolean
}

export type ConversationRow = {
  id: string
  peer_user_id: string
  peer_display_name: string | null
  peer_avatar_url: string | null
  peer_slug: string | null
  last_message_at: Date | null
  last_message_body: string | null
  unread_count: number
}

/** Порт хранилища диалогов: сервис зависит от него, реализацию подставляет app.ts. */
export type ConversationRepositoryPort = {
  list: (user_id: string, cursor: ConversationCursor | null, limit: number) => Promise<ConversationRow[]>
  unreadCount: (user_id: string) => Promise<number>
  isParticipant: (user_id: string, conversation_id: string) => Promise<boolean>
  markRead: (user_id: string, conversation_id: string) => Promise<boolean>
}

/** Порт копии участников: пишется в транзакции потребителя событий. */
export type UsersCopyPort<TTx> = {
  upsertUser: (tx: TTx, patch: UserCopy) => Promise<void>
}
