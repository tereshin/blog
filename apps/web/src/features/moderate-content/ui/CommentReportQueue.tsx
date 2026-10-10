import { Link } from 'react-router'
import { useCommentReportQueue } from '../model/useCommentReportQueue.ts'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState } from '@/shared/ui'
export function CommentReportQueue() {
  const { t } = useT()
  const { query, mutation, items } = useCommentReportQueue()
  if (query.isPending) return <p role="status">{t('common.loading')}</p>
  if (query.isError)
    return <ErrorState title={t('error.unknown')} onRetry={() => void query.refetch()} />
  if (!items.length) return <EmptyState title={t('admin.moderation.reports_empty')} description={t('admin.moderation.reports_empty_hint')} />
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl bg-surface p-4">
          <p className="whitespace-pre-wrap break-words">{item.body}</p>
          <p className="mt-2 text-sm text-muted">
            {t('comment.report_reason')}: {item.reason}
          </p>
          <Link
            className="my-3 block text-sm text-accent"
            to={`/p/${encodeURIComponent(item.article_slug)}?from=moderation#comment-${item.comment_id}`}
          >
            {t('admin.moderation.open')}
          </Link>
          <div className="flex flex-wrap gap-2">
            {(['dismiss', 'hide', 'delete'] as const).map((action) => (
              <Button
                key={action}
                variant="secondary"
                size="sm"
                isDisabled={mutation.isPending}
                onPress={() => mutation.mutate({ id: item.id, action })}
              >
                {t(
                  action === 'dismiss'
                    ? 'comment.report_dismiss'
                    : action === 'hide'
                      ? 'admin.moderation.hide'
                      : 'common.delete',
                )}
              </Button>
            ))}
          </div>
        </article>
      ))}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          onPress={() => void query.fetchNextPage()}
          isDisabled={query.isFetchingNextPage}
        >
          {t('feed.load_more')}
        </Button>
      ) : null}
    </div>
  )
}
