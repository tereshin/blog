import type { ModerationFilters } from '@blog/contracts'
import { moderationFiltersSchema } from '@blog/contracts'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commentKeys, getCommentReports, reviewCommentReport } from '@/entities/comment'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { moderationKeys } from './moderation-keys.ts'
export function useCommentReportQueue(
  filters: ModerationFilters = moderationFiltersSchema.parse({}),
) {
  const { t } = useT()
  const client = useQueryClient()
  const toast = useToast()
  const query = useInfiniteQuery({
    queryKey: moderationKeys.reports(filters),
    queryFn: ({ pageParam, signal }) => getCommentReports(pageParam, signal, filters),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dismiss' | 'hide' | 'delete' }) =>
      reviewCommentReport(id, action),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: moderationKeys.reports() })
      void client.invalidateQueries({ queryKey: commentKeys.all })
    },
    onError: () => toast.error(t('error.unknown')),
  })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  return { query, mutation, items }
}
