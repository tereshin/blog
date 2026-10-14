import type { Message, MessagePage, ServiceContext } from '@blog/contracts'
import { requireVerifiedEmail } from '../../shared/require-verified-email.ts'
import { EmailUnverifiedError, RestrictedError, UnauthorizedError } from '@blog/errors'
import { toExcerpt } from '../../shared/excerpt.ts'
import { pairOf } from '../../shared/pair.ts'
import { MessageConversationNotFoundError, PeerNotFoundError, SelfMessageError } from './message.errors.ts'
import { decodeMessageCursor, encodeMessageCursor } from './message.schema.ts'
import type { MessageQuery } from './message.schema.ts'
import type { MessageRepositoryPort, MessageRow } from './message.types.ts'

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

type SendCommand = Omit<SendInput, 'viewer'> & { sender_id: string }

export class MessageService<TTx> {
  constructor(private readonly repository: MessageRepositoryPort<TTx>) {}

  async list(viewer: ServiceContext, conversation_id: string, query: MessageQuery): Promise<MessagePage> {
    const user_id = requireUser(viewer)
    if (!(await this.repository.isParticipant(user_id, conversation_id))) throw new MessageConversationNotFoundError()
    const cursor = query.cursor ? decodeMessageCursor(query.cursor) : null
    const rows = await this.repository.list(conversation_id, cursor, query.limit + 1)
    const page = rows.slice(0, query.limit)
    const last = page.at(-1)
    return {
      items: page.map(toMessage),
      next_cursor: rows.length > query.limit && last ? encodeMessageCursor({ t: last.created_at.toISOString(), id: last.id }) : null,
    }
  }

  async send(input: SendInput): Promise<Message> {
    const sender_id = requireUser(input.viewer)
    if (input.viewer.is_restricted) throw new RestrictedError()
    if (!requireVerifiedEmail(input.viewer).allowed) throw new EmailUnverifiedError()
    if (input.peer_user_id === sender_id) throw new SelfMessageError()
    const command: SendCommand = {
      sender_id,
      peer_user_id: input.peer_user_id,
      body: input.body,
      idempotency_key: input.idempotency_key,
      correlation_id: input.correlation_id,
    }
    return this.repository.transaction((tx) => this.sendInTransaction(tx, command))
  }

  /** Повтор ключа возвращает сохранённый ответ; копии участников проверяются в той же транзакции, что и запись. */
  private async sendInTransaction(tx: TTx, command: SendCommand): Promise<Message> {
    const { sender_id, peer_user_id, idempotency_key } = command
    if (idempotency_key) {
      await this.repository.lockIdempotencyKey(tx, sender_id, idempotency_key)
      const stored = await this.repository.findStoredResponse(tx, sender_id, idempotency_key)
      if (stored) return stored
    }

    const sender = await this.repository.findRestriction(tx, sender_id)
    if (sender?.is_restricted) throw new RestrictedError()
    const peer = await this.repository.findRestriction(tx, peer_user_id)
    if (!peer) throw new PeerNotFoundError()
    if (peer.is_restricted) throw new RestrictedError()

    const row = await this.repository.appendMessage(tx, {
      pair: pairOf(sender_id, peer_user_id),
      sender_id,
      recipient_id: peer_user_id,
      body: command.body,
      excerpt: toExcerpt(command.body),
      correlation_id: command.correlation_id,
    })
    const message = toMessage(row)
    if (idempotency_key) await this.repository.storeResponse(tx, sender_id, idempotency_key, message)
    return message
  }
}
