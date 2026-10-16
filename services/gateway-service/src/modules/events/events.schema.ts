import { z } from 'zod'

export const MAX_ARTICLE_SUBSCRIPTIONS = 200
export const MAX_CONVERSATION_SUBSCRIPTIONS = 50

/** `PUT /v1/events/subscriptions`. */
export const SubscriptionsInputSchema = z.strictObject({
  connection_id: z.uuid(),
  article_ids: z.array(z.uuid()).max(MAX_ARTICLE_SUBSCRIPTIONS).default([]),
  feed_key: z.string().min(1).max(100).optional(),
  conversation_ids: z.array(z.uuid()).max(MAX_CONVERSATION_SUBSCRIPTIONS).default([]),
  notifications: z.boolean().default(false),
})
export type SubscriptionsInput = z.infer<typeof SubscriptionsInputSchema>

/** Минимум полей события, нужный gateway. Остальное он не читает. */
export const EventFieldsSchema = z.looseObject({
  maintenance_enabled: z.boolean().optional(),
  name: z.string(),
  occurred_at: z.string(),
  article_id: z.uuid().optional(),
  comment_id: z.uuid().optional(),
  conversation_id: z.uuid().optional(),
  notification_id: z.uuid().optional(),
  recipient_id: z.uuid().optional(),
  sender_id: z.uuid().optional(),
  participant_ids: z.array(z.uuid()).optional(),
  visibility: z.enum(['public', 'members', 'author']).optional(),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']).optional(),
  author_id: z.uuid().optional(),
})
export type EventFields = z.infer<typeof EventFieldsSchema>
