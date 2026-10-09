import { z } from 'zod'
import { http } from '@/shared/api'
import type { CommentPage } from '../model/comment-types.ts'
import { commentNodeSchema, toCommentNode } from './comment-mapper.ts'

const pageSchema = z.object({
  comments: z.array(commentNodeSchema),
  next_cursor: z.string().nullable(),
})

/** Дерево комментариев статьи. Курсор листает корни, ответы приходят вместе с корнем. */
export async function getComments(article_id: string, cursor: string | undefined, signal?: AbortSignal): Promise<CommentPage> {
  const page = await http.get(`/v1/articles/${article_id}/comments`, pageSchema, {
    query: { ...(cursor ? { cursor } : {}) },
    ...(signal ? { signal } : {}),
  })
  const now = new Date()
  return { comments: page.comments.map((comment) => toCommentNode(comment, now)), next_cursor: page.next_cursor }
}
