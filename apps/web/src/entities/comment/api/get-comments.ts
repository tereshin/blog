import { z } from 'zod'
import { http } from '@/shared/api'
import { formatTime } from '@/shared/lib'
import type { CommentNode, CommentPage } from '../model/comment-types.ts'

const counts = z.object({ laugh: z.number(), heart: z.number(), thumb: z.number(), fire: z.number() })

const replySchema = z.object({
  id: z.string(),
  author: z.object({ user_id: z.string(), display_name: z.string(), avatar_url: z.string().nullable() }),
  body: z.string().nullable(),
  status: z.enum(['visible', 'deleted', 'hidden']),
  edited_at: z.string().nullable(),
  reaction_counts: counts,
  reaction_count: z.number(),
  my_reaction: z.enum(['laugh', 'heart', 'thumb', 'fire']).nullable(),
  created_at: z.string(),
})

const pageSchema = z.object({
  comments: z.array(replySchema.extend({ replies: z.array(replySchema) })),
  next_cursor: z.string().nullable(),
})

function toNode(dto: z.infer<typeof replySchema> & { replies?: z.infer<typeof replySchema>[] }, now: Date): CommentNode {
  return {
    ...dto,
    time_label: formatTime(dto.created_at, now),
    replies: (dto.replies ?? []).map((reply) => toNode(reply, now)),
  }
}

/** Дерево комментариев статьи. Курсор листает корни, ответы приходят вместе с корнем. */
export async function getComments(article_id: string, cursor: string | undefined, signal?: AbortSignal): Promise<CommentPage> {
  const page = await http.get(`/v1/articles/${article_id}/comments`, pageSchema, {
    query: { ...(cursor ? { cursor } : {}) },
    ...(signal ? { signal } : {}),
  })
  const now = new Date()
  return { comments: page.comments.map((comment) => toNode(comment, now)), next_cursor: page.next_cursor }
}
