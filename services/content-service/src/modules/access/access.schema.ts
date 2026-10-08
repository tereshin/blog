import { z } from 'zod'

export const accessParamsSchema = z.object({ article_id: z.uuid() })

export const articleAccessSchema = z.strictObject({
  can_read: z.boolean(),
  visibility: z.enum(['public', 'members', 'author']),
  status: z.enum(['draft', 'published', 'hidden', 'deleted']),
  author_id: z.uuid(),
})
