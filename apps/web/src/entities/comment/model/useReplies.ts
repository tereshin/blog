import { useInfiniteQuery } from '@tanstack/react-query'
import { getReplies } from '../api/comment-interactions.ts'
import { commentKeys } from './comment-keys.ts'
import type { CommentSort } from './sort-comments.ts'
export function useReplies(
  article_id: string | undefined,
  root_id: string,
  sort: CommentSort,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: commentKeys.replies(article_id ?? 'none', root_id, sort),
    queryFn: ({ pageParam, signal }) => getReplies(root_id, sort, pageParam, signal),
    enabled: Boolean(article_id && enabled),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
}
