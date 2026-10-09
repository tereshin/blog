import type { Conversation, ConversationPage, ServiceContext, UnreadCount } from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'
import { ConversationNotFoundError } from './conversation.errors.ts'
import type { ConversationRepository, ConversationRow } from './conversation.repository.ts'
import { decodeConversationCursor, encodeConversationCursor } from './conversation.schema.ts'
import type { conversationQuerySchema } from './conversation.schema.ts'
import { toExcerpt } from '../../shared/excerpt.ts'
import type { z } from 'zod'

type ConversationQuery = z.infer<typeof conversationQuerySchema>

function requireUser(viewer: ServiceContext): string {
  if (!viewer.user_id) throw new UnauthorizedError()
  return viewer.user_id
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    peer: {
      user_id: row.peer_user_id,
      display_name: row.peer_display_name ?? '',
      avatar_url: row.peer_avatar_url,
      slug: row.peer_slug,
    },
    last_message_at: row.last_message_at ? row.last_message_at.toISOString() : null,
    last_message_excerpt: row.last_message_body ? toExcerpt(row.last_message_body) : null,
    unread_count: row.unread_count,
  }
}

export type ConversationService = {
  list: (viewer: ServiceContext, query: ConversationQuery) => Promise<ConversationPage>
  unreadCount: (viewer: ServiceContext) => Promise<UnreadCount>
  markRead: (viewer: ServiceContext, conversation_id: string) => Promise<void>
}

export function createConversationService(repository: ConversationRepository): ConversationService {
  return {
    async list(viewer, query) {
      const user_id = requireUser(viewer)
      const cursor = query.cursor ? decodeConversationCursor(query.cursor) : null
      const rows = await repository.list(user_id, cursor, query.limit + 1)
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map(toConversation),
        next_cursor:
          rows.length > query.limit && last?.last_message_at
            ? encodeConversationCursor({ t: last.last_message_at.toISOString(), id: last.id })
            : null,
      }
    },

    async unreadCount(viewer) {
      return { count: await repository.unreadCount(requireUser(viewer)) }
    },

    async markRead(viewer, conversation_id) {
      const updated = await repository.markRead(requireUser(viewer), conversation_id)
      if (!updated) throw new ConversationNotFoundError()
    },
  }
}
