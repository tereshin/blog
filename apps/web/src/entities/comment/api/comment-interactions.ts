import { z } from 'zod'
import {
  commentBookmarkStateSchema,
  commentReactorPageSchema,
  commentReportPageSchema,
  commentReportSchema,
  discussionSubscriptionSchema,
  mentionSearchSchema,
} from '@blog/contracts'
import { http } from '@/shared/api'
import { commentNodeSchema, toCommentNode } from './comment-mapper.ts'
import type { CommentSort } from '../model/sort-comments.ts'
const pageSchema = z.object({
  comments: z.array(commentNodeSchema),
  next_cursor: z.string().nullable(),
})
export async function getReplies(
  root_id: string,
  sort: CommentSort,
  cursor?: string,
  signal?: AbortSignal,
) {
  const page = await http.get(`/v1/comments/${root_id}/replies`, pageSchema, {
    query: { sort, cursor },
    signal,
  })
  return { ...page, comments: page.comments.map((dto) => toCommentNode(dto)) }
}
export async function getCommentThread(id: string, signal?: AbortSignal) {
  const dto = await http.get(
    `/v1/comments/${id}/thread`,
    z.object({ article_id: z.string(), root: commentNodeSchema, target: commentNodeSchema }),
    { signal },
  )
  return {
    article_id: dto.article_id,
    root: toCommentNode(dto.root),
    target: toCommentNode(dto.target),
  }
}
export function setCommentBookmark(id: string, saved: boolean) {
  return saved
    ? http.put(`/v1/comments/${id}/bookmark`, commentBookmarkStateSchema)
    : http.delete(`/v1/comments/${id}/bookmark`, commentBookmarkStateSchema)
}
export function reportComment(id: string, reason: string) {
  return http.post(`/v1/comments/${id}/reports`, commentReportSchema, { body: { reason } })
}
export function getCommentReactors(
  id: string,
  kind: string,
  cursor?: string,
  signal?: AbortSignal,
) {
  return http.get(`/v1/comments/${id}/reactors`, commentReactorPageSchema, {
    query: { kind, cursor },
    signal,
  })
}
export async function getSavedComments(cursor?: string, signal?: AbortSignal) {
  const page = await http.get(
    '/v1/comments/bookmarks',
    z.object({
      items: z.array(
        z.object({
          comment: commentNodeSchema,
          article_id: z.string(),
          article_slug: z.string(),
          article_title: z.string(),
        }),
      ),
      next_cursor: z.string().nullable(),
    }),
    { query: { cursor }, signal },
  )
  return {
    ...page,
    items: page.items.map((item) => ({ ...item, comment: toCommentNode(item.comment) })),
  }
}
export function getDiscussionSubscription(id: string, signal?: AbortSignal) {
  return http.get(`/v1/comments/subscriptions/${id}`, discussionSubscriptionSchema, { signal })
}
export function setDiscussionSubscription(id: string, enabled: boolean) {
  return enabled
    ? http.put(`/v1/comments/subscriptions/${id}`, discussionSubscriptionSchema)
    : http.delete(`/v1/comments/subscriptions/${id}`, discussionSubscriptionSchema)
}
export function searchCommentMentions(q: string, signal?: AbortSignal) {
  return http.get('/v1/comments/mentions', mentionSearchSchema, { query: { q }, signal })
}
export function getCommentReports(cursor?: string, signal?: AbortSignal) {
  return http.get('/v1/moderation/comments/reports', commentReportPageSchema, {
    query: { cursor },
    signal,
  })
}
export function reviewCommentReport(id: string, action: 'dismiss' | 'hide' | 'delete') {
  return http.patch(`/v1/moderation/comments/reports/${id}`, commentReportSchema, {
    body: { action },
  })
}
