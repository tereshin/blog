import { z } from 'zod'
import { pageSchema } from './pagination.ts'

/** Собеседник в списке диалогов. */
export const conversationPeerSchema = z.strictObject({
  user_id: z.uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  slug: z.string().nullable(),
})
export type ConversationPeer = z.infer<typeof conversationPeerSchema>

export const conversationSchema = z.strictObject({
  id: z.uuid(),
  peer: conversationPeerSchema,
  last_message_at: z.iso.datetime().nullable(),
  last_message_excerpt: z.string().nullable(),
  unread_count: z.number().int().nonnegative(),
})
export type Conversation = z.infer<typeof conversationSchema>

export const messageSchema = z.strictObject({
  id: z.uuid(),
  conversation_id: z.uuid(),
  sender_id: z.uuid(),
  body: z.string().min(1).max(4000),
  created_at: z.iso.datetime(),
  read_at: z.iso.datetime().nullable(),
})
export type Message = z.infer<typeof messageSchema>

/** Тело `POST /v1/conversations/with/{peer_user_id}/messages`. Только текст, 1–4000 символов. */
export const sendMessageSchema = z.strictObject({
  body: z.string().trim().min(1).max(4000),
})
export type SendMessage = z.infer<typeof sendMessageSchema>

export const conversationPageSchema = pageSchema(conversationSchema)
export type ConversationPage = z.infer<typeof conversationPageSchema>

export const messagePageSchema = pageSchema(messageSchema)
export type MessagePage = z.infer<typeof messagePageSchema>
