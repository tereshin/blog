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
 * Правая карточка «Популярные комментарии». Карточка есть всегда и держит ширину:
 * пустой список и ошибка показываются внутри неё. Заголовок остаётся, список прокручивается.
 */
export function RightRail() {
  const { t } = useT()
  const comments = usePopularComments()
  const items = comments.data ?? []

  return (
    <Card className="flex min-h-0 flex-1 flex-col min-[1200px]:max-h-full min-[1200px]:overflow-hidden">
      <Card.Header className="sticky top-0 z-10 shrink-0 bg-surface">
        <Card.Title className="text-base">{t('shell.rail.title')}</Card.Title>
      </Card.Header>
      <Card.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
  )
}
