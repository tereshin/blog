import { http } from '@/shared/api'
import type { CommentNode } from '../model/comment-types.ts'
import { commentNodeSchema, toCommentNode } from './comment-mapper.ts'

export function deleteComment(comment_id: string): Promise<CommentNode> {
  return http
    .delete(`/v1/comments/${comment_id}`, commentNodeSchema)
    .then((dto) => toCommentNode(dto))
}
