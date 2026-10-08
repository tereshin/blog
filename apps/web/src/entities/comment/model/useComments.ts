import { useInfiniteQuery } from '@tanstack/react-query'
import { getComments } from '../api/get-comments.ts'
import { commentKeys } from './comment-keys.ts'
import type { CommentNode } from './comment-types.ts'

export type CommentsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; refetch: () => void }
  | { status: 'empty' }
  | { status: 'ok'; comments: CommentNode[]; has_next: boolean; fetchNext: () => void }

/** Комментарии статьи страницами. Без идентификатора статьи запрос не начинается. */
export function useComments(article_id: string | null): CommentsState {
  const query = useInfiniteQuery({
    queryKey: commentKeys.list(article_id ?? 'none'),
    queryFn: ({ pageParam, signal }) => getComments(article_id ?? '', pageParam, signal),
    enabled: article_id !== null,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })

  if (article_id === null) return { status: 'idle' }
  if (query.isPending) return { status: 'loading' }
  if (query.isError) return { status: 'error', refetch: () => void query.refetch() }
  const comments = query.data.pages.flatMap((page) => page.comments)
  if (comments.length === 0) return { status: 'empty' }
  return {
    status: 'ok',
    comments,
    has_next: query.hasNextPage,
    fetchNext: () => void query.fetchNextPage(),
  }
}
