import type { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { articleSnapshotShape } from './article-snapshot.ts'

/** Статью удалили. */
export const ArticleDeletedV1 = defineEvent('content.article.deleted', 1, articleSnapshotShape)

export type ArticleDeletedV1 = z.infer<typeof ArticleDeletedV1>
