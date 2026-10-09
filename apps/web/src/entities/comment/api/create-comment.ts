import { createCommentSchema } from '@blog/contracts'
import { http } from '@/shared/api'
import type { CommentNode } from '../model/comment-types.ts'
import { commentNodeSchema, toCommentNode } from './comment-mapper.ts'

export function createComment(
  article_id: string,
  input: { body: string; parent_id?: string },
  idempotency_key: string,
): Promise<CommentNode> {
  return http
    .post(`/v1/articles/${article_id}/comments`, commentNodeSchema, {
      body: createCommentSchema.parse(input),
      idempotency_key,
    })
    .then((dto) => toCommentNode(dto))
}
