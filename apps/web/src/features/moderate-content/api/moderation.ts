import { z } from 'zod'
import { feedCardDtoSchema, toArticleCard } from '@/entities/article'
import type { ArticleCardModel } from '@/entities/article'
import { http, emptyResponseSchema } from '@/shared/api'

const reportSchema = z.object({
  id: z.string(),
  article_id: z.string(),
  reporter_id: z.string(),
  created_at: z.string(),
  status: z.enum(['open', 'reviewed']),
})

const moderationItemSchema = z.object({
  article: feedCardDtoSchema.extend({ status: z.enum(['draft', 'published', 'hidden', 'deleted']) }),
  reports: z.array(reportSchema),
})

const moderationPageSchema = z.object({
  items: z.array(moderationItemSchema),
  next_cursor: z.string().nullable(),
})

const statusSchema = z.object({ id: z.string(), status: z.enum(['draft', 'published', 'hidden', 'deleted']) })

export type ModerationItem = {
  article: ArticleCardModel & { status: 'draft' | 'published' | 'hidden' | 'deleted' }
  reports: { id: string; article_id: string; reporter_id: string; created_at: string; status: 'open' | 'reviewed' }[]
}

export async function getModerationQueue(filter: 'reported' | 'hidden', signal?: AbortSignal): Promise<ModerationItem[]> {
  const page = await http.get('/v1/moderation/articles', moderationPageSchema, { query: { filter }, ...(signal ? { signal } : {}) })
  return page.items.map((item) => ({
    article: { ...toArticleCard(item.article), status: item.article.status },
    reports: item.reports,
  }))
}

export function hideArticle(article_id: string): Promise<{ id: string; status: string }> {
  return http.post(`/v1/articles/${article_id}/hide`, statusSchema)
}

export function restoreArticle(article_id: string): Promise<{ id: string; status: string }> {
  return http.post(`/v1/articles/${article_id}/restore`, statusSchema)
}

export function deleteModeratedArticle(article_id: string): Promise<void> {
  return http.delete(`/v1/moderation/articles/${article_id}`, emptyResponseSchema)
}

export function hideComment(comment_id: string): Promise<unknown> {
  return http.post(`/v1/comments/${comment_id}/hide`, z.unknown())
}

export function restoreComment(comment_id: string): Promise<unknown> {
  return http.post(`/v1/comments/${comment_id}/restore`, z.unknown())
}

export function deleteModeratedComment(comment_id: string): Promise<unknown> {
  return http.delete(`/v1/moderation/comments/${comment_id}`, z.unknown())
}

export function reviewReport(report_id: string): Promise<unknown> {
  return http.patch(`/v1/reports/${report_id}`, reportSchema, { body: { status: 'reviewed' } })
}
