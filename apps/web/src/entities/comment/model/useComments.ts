import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { getCommentThread } from '../api/comment-interactions.ts'
import type { CommentSort } from './sort-comments.ts'
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
export function useComments(article_id: string | null, sort: CommentSort = 'best'): CommentsState {
  const { hash } = useLocation()
  const anchor_id = hash.startsWith('#comment-') ? hash.slice(9) : ''
  const anchor = useQuery({
    queryKey: commentKeys.thread(anchor_id),
    queryFn: ({ signal }) => getCommentThread(anchor_id, signal),
    enabled: Boolean(anchor_id && article_id),
    retry: false,
  })
  const query = useInfiniteQuery({
    queryKey: commentKeys.sorted(article_id ?? 'none', sort),
    queryFn: ({ pageParam, signal }) => getComments(article_id ?? '', pageParam, signal, sort),
    enabled: article_id !== null,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })

  if (article_id === null) return { status: 'idle' }
  if (query.isPending) return { status: 'loading' }
  if (query.isError) return { status: 'error', refetch: () => void query.refetch() }
  const comments = query.data.pages.flatMap((page) => page.comments)
  if (anchor.isSuccess && anchor.data?.article_id === article_id) {
    const { root, target } = anchor.data
    const anchored_root = target.id === root.id ? root : { ...root, replies: [target] }
    const index = comments.findIndex((comment) => comment.id === root.id)
    if (index === -1) comments.unshift(anchored_root)
    else if (target.id !== root.id) {
      const current = comments[index]
      if (current) comments[index] = { ...current, replies: [target] }
    }
  }
  if (comments.length === 0) return { status: 'empty' }
  return {
    status: 'ok',
    comments,
    has_next: query.hasNextPage,
    fetchNext: () => void query.fetchNextPage(),
  }
}
