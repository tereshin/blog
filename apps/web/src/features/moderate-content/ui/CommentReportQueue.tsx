import { useT } from '@/shared/i18n'
import { useCommentReportQueue } from '../model/useCommentReportQueue.ts'
import { useModerationFilters } from '../model/useModerationFilters.ts'
import { ModerationTable } from './ModerationTable.tsx'
import { ModerationFilters } from './ModerationFilters.tsx'
import { ReportActions } from './ReportActions.tsx'
export function CommentReportQueue() {
  const { t } = useT()
  const { filters, setFilter } = useModerationFilters()
  const { query, items } = useCommentReportQueue(filters)
  const rows = items.map((item) => ({
    id: item.id,
    href: `/p/${encodeURIComponent(item.article_slug)}?from=moderation#comment-${item.comment_id}`,
    content: item.body ?? '',
    author: item.author_name || item.author_id || '—',
    reporter: item.reporter_id,
    date: item.created_at,
    status: t(item.status === 'open' ? 'admin.filters.open' : 'admin.filters.reviewed'),
    reason: item.reason,
    actions: <ReportActions id={item.id} kind="comment" status={item.status} />,
  }))
  return (
    <ModerationTable
      label={t('admin.moderation.comments')}
      rows={rows}
      toolbar={
        <ModerationFilters
          value={filters}
          onChange={setFilter}
          article_filters={false}
          report_filters
        />
      }
      is_loading={query.isPending}
      error={
        query.isError
          ? { title: t('error.unknown'), onRetry: () => void query.refetch() }
          : undefined
      }
      pagination={
        query.hasNextPage
          ? { is_loading: query.isFetchingNextPage, onLoadMore: () => void query.fetchNextPage() }
          : undefined
      }
    />
  )
}
