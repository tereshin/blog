import { useInfiniteQuery } from '@tanstack/react-query'
import { commentKeys, getSavedComments } from '@/entities/comment'
export function useSavedComments() {
  const query = useInfiniteQuery({
    queryKey: commentKeys.bookmarks(),
    queryFn: ({ pageParam, signal }) => getSavedComments(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  return { query, items }
}
