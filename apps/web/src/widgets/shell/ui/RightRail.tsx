import { PopularCommentItem, usePopularComments } from '@/entities/comment'
import { useT } from '@/shared/i18n'
import { Card, EmptyState, ErrorState, Skeleton } from '@/shared/ui'

function RailSkeleton() {
  const { t } = useT()
  return (
    <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-4 px-2">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex gap-3">
          <Skeleton shape="circle" className="size-8 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Правый столбец шириной 320: стопка отдельных скруглённых карточек.
 * Обязательная карточка — «Популярные комментарии». Пустой список остаётся в ней и не схлопывает ширину.
 */
export function RightRail() {
  const { t } = useT()
  const comments = usePopularComments()
  const items = comments.data ?? []

  return (
    <section aria-label={t('shell.popular_comments')} className="flex w-[320px] flex-col gap-4">
      <Card>
        <Card.Header>
          <Card.Title className="text-base">{t('shell.rail.title')}</Card.Title>
        </Card.Header>
        <Card.Content>
          {comments.isPending ? (
            <RailSkeleton />
          ) : comments.isError ? (
            <ErrorState title={t('shell.rail.error')} onRetry={() => void comments.refetch()} className="py-6" />
          ) : items.length === 0 ? (
            <EmptyState title={t('shell.rail.empty')} />
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((comment) => (
                <PopularCommentItem key={comment.id} comment={comment} />
              ))}
            </ul>
          )}
        </Card.Content>
      </Card>
    </section>
  )
}
