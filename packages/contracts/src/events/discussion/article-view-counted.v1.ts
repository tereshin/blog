import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Просмотр засчитан. `view_count` — полное число статьи после этого зачёта, не дельта. */
export const ArticleViewCountedV1 = defineEvent('discussion.article_view.counted', 1, {
  article_id: z.uuid(),
  view_count: z.number().int().nonnegative(),
})

export type ArticleViewCountedV1 = z.infer<typeof ArticleViewCountedV1>
