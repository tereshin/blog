import { updateCommentSchema } from '@blog/contracts'
import { http } from '@/shared/api'
import type { CommentNode } from '../model/comment-types.ts'
import { commentNodeSchema, toCommentNode } from './comment-mapper.ts'

export function updateComment(comment_id: string, body: string): Promise<CommentNode> {
  return http
    .patch(`/v1/comments/${comment_id}`, commentNodeSchema, { body: updateCommentSchema.parse({ body }) })
    .then((dto) => toCommentNode(dto))
}
