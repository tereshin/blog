import { useCallback, useMemo } from 'react'
import { UserListItem } from '@/entities/user'
import type { UserListPage } from '@/entities/user'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Card, EmptyState, ErrorState, VirtualList } from '@/shared/ui'
import { usePeopleList } from '../model/usePeopleList.ts'

const VIRTUALIZATION_THRESHOLD = 100

type PeopleListProps = {
  title_key: MessageKey
  query_key: readonly unknown[]
  load: (slug: string, cursor: string | null, signal: AbortSignal) => Promise<UserListPage>
}

/** Список подписчиков или подписок с заголовком из имени профиля. */
export function PeopleList({ title_key, query_key, load }: PeopleListProps) {
  const { t } = useT()
  const { people, items, title } = usePeopleList(title_key, query_key, load)
  const user_by_id = useMemo(() => new Map(items.map((user) => [user.user_id, user])), [items])
  const ids = items.map((user) => user.user_id)
  const handleNearEnd = useCallback(() => {
    if (people.hasNextPage && !people.isFetchingNextPage) void people.fetchNextPage()
  }, [people])

  return (
    <Card className="gap-0 max-w-[var(--shell-content-width,640px)] mx-auto">
      <Card.Header className="px-5 pt-5 pb-2">
        <h1 className="text-xl font-semibold">{title}</h1>
      </Card.Header>
      <Card.Content className="px-5 pt-0 pb-4">
        {people.isError ? <ErrorState title={t('error.unknown')} onRetry={() => void people.refetch()} /> : null}
        {people.data && items.length === 0 ? (
          <EmptyState
            title={t('profile.list_empty')}
            description={t('profile.list_empty_hint')}
            className="min-h-0 rounded-none bg-transparent px-0 py-6 shadow-none"
          />
        ) : null}
        {items.length > VIRTUALIZATION_THRESHOLD ? (
          <VirtualList
            ids={ids}
            estimate_size={56}
            onNearEnd={handleNearEnd}
            renderItem={(id) => {
              const user = user_by_id.get(id)
              return user ? <UserListItem user={user} /> : null
            }}
          />
        ) : items.length > 0 ? (
          <ul>
            {items.map((user) => (
              <li key={user.user_id}>
                <UserListItem user={user} />
              </li>
            ))}
          </ul>
        ) : null}
      </Card.Content>
      {people.hasNextPage ? (
        <Card.Footer className="px-5 pb-4">
          <Button variant="ghost" onPress={() => void people.fetchNextPage()}>
            {t('common.more')}
          </Button>
        </Card.Footer>
      ) : null}
    </Card>
  )
}
