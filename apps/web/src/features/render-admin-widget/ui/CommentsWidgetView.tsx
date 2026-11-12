import { useQuery } from '@tanstack/react-query'
import type { CommentsWidget } from '@blog/contracts'
import { CommentThread, getWidgetComments } from '@/entities/comment'
import { useT } from '@/shared/i18n'
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui'
export function CommentsWidgetView({ data }: { data: CommentsWidget }) {
  const { t } = useT()
  const query = useQuery({
    queryKey: ['widget-comments', data],
    queryFn: ({ signal }) => getWidgetComments(data, signal),
    staleTime: 30000,
  })
  if (query.isPending)
    return (
      <div role="status" aria-label={t('common.loading')} className="grid gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  if (query.isError)
    return <ErrorState title={t('shell.rail.error')} onRetry={() => void query.refetch()} />
  if (!query.data.length)
    return (
      <EmptyState
        title={t('shell.rail.empty')}
        className="min-h-0 bg-transparent px-0 py-6 shadow-none"
      />
    )
  return (
    <ul className="flex flex-col gap-5">
      {query.data.map((comment) => (
        <CommentThread.Popular key={comment.id} comment={comment} />
      ))}
    </ul>
  )
}
