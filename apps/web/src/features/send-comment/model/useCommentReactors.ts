import { useInfiniteQuery } from '@tanstack/react-query'
import { commentKeys, getCommentReactors } from '@/entities/comment'
export function useCommentReactors(id: string, kind: string) {
  const query = useInfiniteQuery({
    queryKey: commentKeys.reactors(id, kind),
    queryFn: ({ pageParam, signal }) => getCommentReactors(id, kind, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  return { query, items }
}
