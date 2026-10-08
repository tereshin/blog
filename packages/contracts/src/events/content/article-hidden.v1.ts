import type { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { articleSnapshotShape } from './article-snapshot.ts'

/** Модератор скрыл статью. */
export const ArticleHiddenV1 = defineEvent('content.article.hidden', 1, articleSnapshotShape)

export type ArticleHiddenV1 = z.infer<typeof ArticleHiddenV1>
