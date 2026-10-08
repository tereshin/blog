import type { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { articleSnapshotShape } from './article-snapshot.ts'

/** Статью правили (видимость, заголовок, адрес, комментарии). */
export const ArticleUpdatedV1 = defineEvent('content.article.updated', 1, articleSnapshotShape)

export type ArticleUpdatedV1 = z.infer<typeof ArticleUpdatedV1>
