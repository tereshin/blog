import { useT } from '@/shared/i18n'
import { useArticleModerationQueue } from '../model/useArticleModerationQueue.ts'
import { useModerationFilters } from '../model/useModerationFilters.ts'
import { ArticleModerationActions } from './ArticleModerationActions.tsx'
import { ModerationTable } from './ModerationTable.tsx'
import { ModerationFilters } from './ModerationFilters.tsx'
import { ReportActions } from './ReportActions.tsx'
export function ArticleModerationQueue({ filter }: { filter: 'reported' | 'hidden' | 'search' }) {
  const { t } = useT()
  const { filters, setFilter } = useModerationFilters()
  const { query, items } = useArticleModerationQueue(filter, filters)
  const rows = items.map((item) => ({
    id: item.report?.id ?? item.article.id,
    href: `/p/${encodeURIComponent(item.article.slug)}?from=moderation`,
    content: item.article.title,
    author: item.article.author.display_name || item.article.author.user_id,
    reporter: item.report?.reporter_id,
    date: item.report?.created_at ?? item.updated_at ?? item.article.published_at,
    status: item.report
      ? t(item.report.status === 'open' ? 'admin.filters.open' : 'admin.filters.reviewed')
      : t(item.article.status === 'hidden' ? 'admin.filters.hidden' : 'admin.filters.published'),
    actions: item.report ? (
      <ReportActions id={item.report.id} kind="article" status={item.report.status} />
    ) : (
      <ArticleModerationActions article_id={item.article.id} status={item.article.status} />
    ),
  }))
  return (
    <ModerationTable
      label={t('admin.moderation.articles')}
      rows={rows}
      toolbar={
        <ModerationFilters
          value={filters}
          onChange={setFilter}
          article_filters
          report_filters={filter === 'reported'}
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
