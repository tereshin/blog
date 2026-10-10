import { z } from 'zod'
import { pageSchema } from './pagination.ts'

export const notificationKindSchema = z.enum([
  'comment',
  'reply',
  'reaction',
  'message',
  'moderation',
  'mention',
])
export type NotificationKind = z.infer<typeof notificationKindSchema>

export const notificationSchema = z.strictObject({
  id: z.uuid(),
  kind: notificationKindSchema,
  article_id: z.uuid().nullable(),
  article_slug: z.string().nullable(),
  article_title: z.string().nullable(),
  comment_id: z.uuid().nullable(),
  conversation_id: z.uuid().nullable(),
  actor: z.strictObject({
    display_name: z.string(),
    avatar_url: z.string().nullable(),
  }),
  read_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
})
export type Notification = z.infer<typeof notificationSchema>

export const notificationPageSchema = pageSchema(notificationSchema)
export type NotificationPage = z.infer<typeof notificationPageSchema>

export const unreadCountSchema = z.strictObject({
  count: z.number().int().nonnegative(),
})
export type UnreadCount = z.infer<typeof unreadCountSchema>
