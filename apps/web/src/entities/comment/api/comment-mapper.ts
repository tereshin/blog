import { z } from 'zod'
import { formatTime } from '@/shared/lib'
import type { CommentNode } from '../model/comment-types.ts'

const counts = z.object({ laugh: z.number(), heart: z.number(), thumb: z.number(), fire: z.number() })

export const commentReplySchema = z.object({
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

export const commentNodeSchema = commentReplySchema.extend({ replies: z.array(commentReplySchema) })

type CommentDto = z.infer<typeof commentReplySchema> & { replies?: z.infer<typeof commentReplySchema>[] }

export function toCommentNode(dto: CommentDto, now: Date = new Date()): CommentNode {
  return {
    ...dto,
    time_label: formatTime(dto.created_at, now),
    replies: (dto.replies ?? []).map((reply) => toCommentNode(reply, now)),
  }
}
