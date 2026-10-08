import { z } from 'zod'
import { reactionCountsSchema } from '../../http/feed.ts'
import { defineEvent } from '../envelope.ts'

const topCommentSchema = z.strictObject({
  id: z.uuid(),
  author_id: z.uuid(),
  body: z.string(),
  reaction_count: z.number().int().nonnegative(),
  reply_count: z.number().int().nonnegative(),
})

/**
 * Полный снимок счётчиков статьи. Потребитель записывает значения как есть, не прибавляя к прежним.
 * `top_comment` — самый обсуждаемый видимый комментарий в том виде, в каком его хранит content.
 */
export const ArticleCountersUpdatedV1 = defineEvent('discussion.article_counters.updated', 1, {
  article_id: z.uuid(),
  reaction_counts: reactionCountsSchema,
  reaction_count: z.number().int().nonnegative(),
  comment_count: z.number().int().nonnegative(),
  view_count: z.number().int().nonnegative(),
  bookmark_count: z.number().int().nonnegative(),
  top_comment: topCommentSchema.nullable(),
})

export type ArticleCountersUpdatedV1 = z.infer<typeof ArticleCountersUpdatedV1>
