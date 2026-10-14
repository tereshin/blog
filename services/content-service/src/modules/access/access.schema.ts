import { z } from 'zod'

export const AccessParamsSchema = z.object({ article_id: z.uuid() })

export const ArticleAccessSchema = z.strictObject({
  can_read: z.boolean(),
  visibility: z.enum(['public', 'members', 'author']),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  author_id: z.uuid(),
})
