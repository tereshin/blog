import { articleDraftSchema, createArticleSchema } from '@blog/contracts'
import type { ArticleDraft, CreateArticle } from '@blog/contracts'
import { http } from '@/shared/api'

export type { ArticleDraft }

export function createArticle(body: CreateArticle): Promise<ArticleDraft> {
  return http.post('/v1/articles', articleDraftSchema, { body: createArticleSchema.parse(body) })
}
