import type { ModerationPage } from '../api/moderation.ts'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { ModerationFilters } from '@blog/contracts'
import { moderationFiltersSchema } from '@blog/contracts'
import { getArticleReportPage, getModerationQueuePage } from '../api/moderation.ts'
import { moderationKeys } from './moderation-keys.ts'

export function useArticleModerationQueue(
  filter: 'reported' | 'hidden' | 'search',
  filters: ModerationFilters = moderationFiltersSchema.parse({}),
) {
  const query = useInfiniteQuery({
    queryKey: moderationKeys.list(filter, filters),
    queryFn: async ({ pageParam, signal }): Promise<ModerationPage> => {
      if (filter === 'reported') return getArticleReportPage(filters, pageParam, signal)
      const page = await getModerationQueuePage(filter, pageParam, signal, filters)
      return { ...page, items: page.items.map((item) => ({ ...item, report: undefined })) }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
  return { query, items: query.data?.pages.flatMap((page) => page.items) ?? [] }
}
