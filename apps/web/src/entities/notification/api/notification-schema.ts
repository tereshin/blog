import { z } from 'zod'

export const notificationDtoSchema = z.object({
  id: z.string(),
  kind: z.enum(['comment', 'reply', 'reaction', 'message', 'moderation']),
  article_id: z.string().nullable(),
  article_slug: z.string().nullable(),
  article_title: z.string().nullable(),
  comment_id: z.string().nullable(),
  conversation_id: z.string().nullable(),
  actor: z.object({ display_name: z.string(), avatar_url: z.string().nullable() }),
  read_at: z.string().nullable(),
  created_at: z.string(),
})

export const notificationPageDtoSchema = z.object({
  items: z.array(notificationDtoSchema),
  next_cursor: z.string().nullable(),
})

export const unreadCountDtoSchema = z.object({ count: z.number().int().nonnegative() })

export type NotificationModel = z.infer<typeof notificationDtoSchema> & { href: string }

export function toNotification(dto: z.infer<typeof notificationDtoSchema>): NotificationModel {
  const slug = dto.article_slug
  const article_href = slug ? `/p/${encodeURIComponent(slug)}` : '/'
  const comment_href = dto.comment_id ? `${article_href}#comment-${dto.comment_id}` : article_href
  const href =
    dto.kind === 'message' && dto.conversation_id
      ? `/messages/${encodeURIComponent(dto.conversation_id)}`
      : dto.kind === 'comment' || dto.kind === 'reply'
        ? comment_href
        : article_href
  return { ...dto, href }
}
