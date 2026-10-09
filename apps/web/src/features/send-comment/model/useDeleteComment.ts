import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commentKeys, deleteComment } from '@/entities/comment'
import type { CommentNode } from '@/entities/comment'
import type { CommentCache } from './comment-cache.ts'
import { mapComments } from './comment-cache.ts'

function withoutComment(node: CommentNode, comment_id: string): CommentNode | null {
  if (node.id !== comment_id) return node
  if (node.replies.length === 0) return null
  return { ...node, status: 'deleted', body: null }
}

export function useDeleteComment(article_id: string): {
  remove: (comment_id: string) => void
  is_pending: boolean
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (comment_id: string) => deleteComment(comment_id),
    onSuccess: (comment) => {
      queryClient.setQueryData<CommentCache>(commentKeys.list(article_id), (cache) => {
        if (!cache) return cache
        return mapComments(cache, (node) => {
          if (node.id !== comment.id) return node
          return withoutComment({ ...node, status: comment.status, body: comment.body }, comment.id)
        })
      })
    },
  })
  return { is_pending: mutation.isPending, remove: (comment_id) => mutation.mutate(comment_id) }
}
