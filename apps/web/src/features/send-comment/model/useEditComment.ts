import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commentKeys, updateComment } from '@/entities/comment'
import type { CommentCache } from './comment-cache.ts'
import { replaceComment } from './comment-cache.ts'

export function useEditComment(article_id: string): {
  save: (comment_id: string, body: string) => void
  is_pending: boolean
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: { comment_id: string; body: string }) =>
      updateComment(input.comment_id, input.body),
    onSuccess: (comment) => {
      void queryClient.invalidateQueries({ queryKey: commentKeys.all })
      queryClient.setQueriesData<CommentCache>(
        { queryKey: commentKeys.list(article_id) },
        (cache) => (cache ? replaceComment(cache, comment.id, comment) : cache),
      )
    },
  })
  return {
    is_pending: mutation.isPending,
    save: (comment_id, body) => mutation.mutate({ comment_id, body }),
  }
}
