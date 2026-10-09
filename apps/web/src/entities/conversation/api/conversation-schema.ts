import { conversationPageSchema, messagePageSchema, messageSchema } from '@blog/contracts'
import type { Conversation, Message } from '@blog/contracts'
import { formatTime } from '@/shared/lib'

export { conversationPageSchema, messagePageSchema, messageSchema }
export type { Conversation, Message }

export type ConversationModel = Conversation & { time_label: string }
export type MessageModel = Message & { time_label: string }
export type ConversationPageModel = { items: ConversationModel[]; next_cursor: string | null }
export type MessagePageModel = { items: MessageModel[]; next_cursor: string | null }

export function toConversation(dto: Conversation, now: Date = new Date()): ConversationModel {
  return { ...dto, time_label: dto.last_message_at ? formatTime(dto.last_message_at, now) : '' }
}

export function toMessage(dto: Message, now: Date = new Date()): MessageModel {
  return { ...dto, time_label: formatTime(dto.created_at, now) }
}
