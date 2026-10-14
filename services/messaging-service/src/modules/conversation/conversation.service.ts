import type { Conversation, ConversationPage, ServiceContext, UnreadCount } from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'
import { toExcerpt } from '../../shared/excerpt.ts'
import { ConversationNotFoundError } from './conversation.errors.ts'
import { decodeConversationCursor, encodeConversationCursor } from './conversation.schema.ts'
import type { ConversationQuery } from './conversation.schema.ts'
import type { ConversationRepositoryPort, ConversationRow } from './conversation.types.ts'

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

export class ConversationService {
  constructor(private readonly repository: ConversationRepositoryPort) {}

  async list(viewer: ServiceContext, query: ConversationQuery): Promise<ConversationPage> {
    const user_id = requireUser(viewer)
    const cursor = query.cursor ? decodeConversationCursor(query.cursor) : null
    const rows = await this.repository.list(user_id, cursor, query.limit + 1)
    const page = rows.slice(0, query.limit)
    const last = page.at(-1)
    return {
      items: page.map(toConversation),
      next_cursor:
        rows.length > query.limit && last?.last_message_at
          ? encodeConversationCursor({ t: last.last_message_at.toISOString(), id: last.id })
          : null,
    }
  }

  async unreadCount(viewer: ServiceContext): Promise<UnreadCount> {
    return { count: await this.repository.unreadCount(requireUser(viewer)) }
  }

  async markRead(viewer: ServiceContext, conversation_id: string): Promise<void> {
    const is_updated = await this.repository.markRead(requireUser(viewer), conversation_id)
    if (!is_updated) throw new ConversationNotFoundError()
  }
}
