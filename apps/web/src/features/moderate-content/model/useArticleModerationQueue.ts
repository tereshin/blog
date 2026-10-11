import { useInfiniteQuery } from '@tanstack/react-query'
import { getModerationQueuePage } from '../api/moderation.ts'
import { moderationKeys } from './moderation-keys.ts'

export function useArticleModerationQueue(filter: 'reported' | 'hidden') {
  const query = useInfiniteQuery({
    queryKey: moderationKeys.list(filter),
    queryFn: ({ pageParam, signal }) => getModerationQueuePage(filter, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
  return { query, items: query.data?.pages.flatMap((page) => page.items) ?? [] }
}
