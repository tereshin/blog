import { PopularCommentItem, usePopularComments } from '@/entities/comment'
import { useT } from '@/shared/i18n'
import { Card, EmptyState, ErrorState, Skeleton } from '@/shared/ui'

function RailSkeleton() {
  const { t } = useT()
  return (
    <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-5">
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" className="size-9 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
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
  const items = (comments.data ?? []).slice(0, 2)

  return (
    <section aria-label={t('shell.popular_comments')} className="flex w-[320px] flex-col gap-4">
      <Card className="gap-0">
        <Card.Header className="px-4 pt-5 pb-3">
          <Card.Title className="text-[15px] font-medium leading-5">
            {t('shell.rail.title')}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-4 pt-0 pb-5">
          {comments.isPending ? (
            <RailSkeleton />
          ) : comments.isError ? (
            <ErrorState
              title={t('shell.rail.error')}
              onRetry={() => void comments.refetch()}
              className="py-6"
            />
          ) : items.length === 0 ? (
            <EmptyState title={t('shell.rail.empty')} className="min-h-0 rounded-none bg-transparent px-0 py-6 shadow-none" />
          ) : (
            <ul className="flex flex-col gap-5">
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
