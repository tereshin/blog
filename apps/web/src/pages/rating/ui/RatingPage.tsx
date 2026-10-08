import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { UserListItem, getRating, userKeys } from '@/entities/user'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState } from '@/shared/ui'
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
    setHeaderCenter({ kind: 'pill' })
  }, [setHeaderCenter])

  const items = (rating.data?.pages ?? []).flatMap((page) => page.items)

  return (
    <div className="flex flex-col gap-3">
      <h1 className="px-1 text-xl font-semibold">{t('rating.title')}</h1>
      {rating.isError ? <ErrorState title={t('error.unknown')} onRetry={() => void rating.refetch()} /> : null}
      {rating.data && items.length === 0 ? <EmptyState title={t('rating.empty')} /> : null}
      {items.length > 0 ? (
        <ol>
          {items.map((user) => (
            <UserListItem key={user.user_id} user={user} />
          ))}
        </ol>
      ) : null}
      {rating.hasNextPage ? (
        <Button variant="ghost" onPress={() => void rating.fetchNextPage()}>
          {t('common.more')}
        </Button>
      ) : null}
    </div>
  )
}
