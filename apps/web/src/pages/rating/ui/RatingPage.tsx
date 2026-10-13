import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { UserListItem, getRating, userKeys } from '@/entities/user'
import { useT } from '@/shared/i18n'
import { Button, Card, EmptyState, ErrorState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

export default function RatingPage() {
  const { t } = useT()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const rating = useInfiniteQuery({
    queryKey: userKeys.rating(),
    queryFn: ({ pageParam, signal }) => getRating(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
  })

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
  }, [setHeaderCenter])

  const items = (rating.data?.pages ?? []).flatMap((page) => page.items)

  return (
    <Card className="gap-0 max-w-[var(--shell-content-width,640px)] mx-auto">
      <Card.Header className="px-5 pt-5 pb-2">
        <h1 className="text-xl font-semibold">{t('rating.title')}</h1>
      </Card.Header>
      <Card.Content className="px-5 pt-0 pb-4">
        {rating.isError ? <ErrorState title={t('error.unknown')} onRetry={() => void rating.refetch()} /> : null}
        {rating.data && items.length === 0 ? (
          <EmptyState
            title={t('rating.empty')}
            description={t('rating.empty_hint')}
            className="min-h-0 rounded-none bg-transparent px-0 py-6 shadow-none"
          />
        ) : null}
        {items.length > 0 ? (
          <ol>
            {items.map((user) => (
              <UserListItem key={user.user_id} user={user} />
            ))}
          </ol>
        ) : null}
      </Card.Content>
      {rating.hasNextPage ? (
        <Card.Footer className="px-5 pb-4">
          <Button variant="ghost" onPress={() => void rating.fetchNextPage()}>
            {t('common.more')}
          </Button>
        </Card.Footer>
      ) : null}
    </Card>
  )
}
