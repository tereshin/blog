import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { articleSnapshotShape } from './article-snapshot.ts'

/** Модератор вернул скрытую статью в публикацию. */
export const ArticleRestoredV1 = defineEvent('content.article.restored', 1, {
  ...articleSnapshotShape,
  moderator_id: z.uuid().optional(),
})

export type ArticleRestoredV1 = z.infer<typeof ArticleRestoredV1>
