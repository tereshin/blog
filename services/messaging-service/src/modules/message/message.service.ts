import type { Message, MessagePage, ServiceContext } from '@blog/contracts'
import { requireVerifiedEmail } from '@blog/contracts'
import { EmailUnverifiedError, RestrictedError, UnauthorizedError } from '@blog/errors'
import { MessageConversationNotFoundError, SelfMessageError } from './message.errors.ts'
import type { MessageRepository, MessageRow } from './message.repository.ts'
import { decodeMessageCursor, encodeMessageCursor } from './message.schema.ts'
import type { messageQuerySchema } from './message.schema.ts'
import type { z } from 'zod'

type MessageQuery = z.infer<typeof messageQuerySchema>

function requireUser(viewer: ServiceContext): string {
  if (!viewer.user_id) throw new UnauthorizedError()
  return viewer.user_id
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    body: row.body,
    created_at: row.created_at.toISOString(),
    read_at: row.read_at ? row.read_at.toISOString() : null,
  }
}

export type SendInput = {
  viewer: ServiceContext
  peer_user_id: string
  body: string
  idempotency_key: string | null
  correlation_id: string
}

export type MessageService = {
  list: (viewer: ServiceContext, conversation_id: string, query: MessageQuery) => Promise<MessagePage>
  send: (input: SendInput) => Promise<Message>
}

export function createMessageService(repository: MessageRepository): MessageService {
  return {
    async list(viewer, conversation_id, query) {
      const user_id = requireUser(viewer)
      if (!(await repository.isParticipant(user_id, conversation_id))) throw new MessageConversationNotFoundError()
      const cursor = query.cursor ? decodeMessageCursor(query.cursor) : null
      const rows = await repository.list(conversation_id, cursor, query.limit + 1)
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map(toMessage),
        next_cursor: rows.length > query.limit && last ? encodeMessageCursor({ t: last.created_at.toISOString(), id: last.id }) : null,
      }
    },

    async send(input) {
      const sender_id = requireUser(input.viewer)
      if (input.viewer.is_restricted) throw new RestrictedError()
      if (!requireVerifiedEmail(input.viewer).allowed) throw new EmailUnverifiedError()
      if (input.peer_user_id === sender_id) throw new SelfMessageError()
      return repository.send({
        sender_id,
        peer_user_id: input.peer_user_id,
        body: input.body,
        idempotency_key: input.idempotency_key,
        correlation_id: input.correlation_id,
      })
    },
  }
}
