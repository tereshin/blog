import { useInfiniteQuery } from '@tanstack/react-query'
import { getRating } from '../api/get-user-list.ts'
import { userKeys } from './user-keys.ts'

export function useRating(limit = 20) {
  return useInfiniteQuery({
    queryKey: userKeys.rating(limit),
    queryFn: ({ pageParam, signal }) => getRating(pageParam, signal, limit),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    staleTime: 30_000,
  })
}
