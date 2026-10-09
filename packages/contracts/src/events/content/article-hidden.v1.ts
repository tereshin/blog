import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { articleSnapshotShape } from './article-snapshot.ts'

/** Модератор скрыл статью. Снимок тот же, что у остальных `content.article.*`, плюс кто скрыл. */
export const ArticleHiddenV1 = defineEvent('content.article.hidden', 1, {
  ...articleSnapshotShape,
  moderator_id: z.uuid().optional(),
})

export type ArticleHiddenV1 = z.infer<typeof ArticleHiddenV1>
