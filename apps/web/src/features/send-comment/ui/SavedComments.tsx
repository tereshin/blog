import { Link } from 'react-router'
import { CommentItem } from '@/entities/comment'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState } from '@/shared/ui'
import { useSavedComments } from '../model/useSavedComments.ts'
import { CommentOverflowMenu } from './CommentOverflowMenu.tsx'
export function SavedComments() {
  const { t } = useT()
  const { query, items } = useSavedComments()
  if (query.isPending) return <p role="status">{t('common.loading')}</p>
  if (query.isError)
    return <ErrorState title={t('comment.load_error')} onRetry={() => void query.refetch()} />
  if (!items.length) return <EmptyState title={t('comment.saved_empty')} />
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.comment.id} className="rounded-2xl bg-surface px-4">
          <Link
            to={`/p/${encodeURIComponent(item.article_slug)}#comment-${item.comment.id}`}
            className="mt-4 block text-sm font-medium text-accent"
          >
            {item.article_title}
          </Link>
          <CommentItem
            comment={{ ...item.comment, reply_count: 0, replies: [] }}
            renderActions={(comment) => <CommentOverflowMenu comment={comment} />}
          />
        </div>
      ))}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          isDisabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          {t('feed.load_more')}
        </Button>
      ) : null}
    </div>
  )
}
