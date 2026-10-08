import type { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { articleSnapshotShape } from './article-snapshot.ts'

/** Статья опубликована впервые. */
export const ArticlePublishedV1 = defineEvent('content.article.published', 1, articleSnapshotShape)

export type ArticlePublishedV1 = z.infer<typeof ArticlePublishedV1>
