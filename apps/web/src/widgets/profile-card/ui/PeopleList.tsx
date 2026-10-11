import { useInfiniteQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { useProfile } from '@/entities/profile'
import { UserListItem } from '@/entities/user'
import type { UserListPage } from '@/entities/user'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Card, EmptyState, ErrorState } from '@/shared/ui'

type PeopleListProps = {
  title_key: MessageKey
  query_key: readonly unknown[]
  load: (slug: string, cursor: string | null, signal: AbortSignal) => Promise<UserListPage>
}

/** Список подписчиков или подписок с заголовком из имени профиля. */
export function PeopleList({ title_key, query_key, load }: PeopleListProps) {
  const { slug = '' } = useParams()
  const { t } = useT()
  const profile = useProfile(slug)
  const people = useInfiniteQuery({
    queryKey: query_key,
    queryFn: ({ pageParam, signal }) => load(slug, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: Boolean(slug),
  })

  const items = (people.data?.pages ?? []).flatMap((page) => page.items)
  const title = profile.data ? `${t(title_key)} · ${profile.data.display_name}` : t(title_key)

  return (
    <Card className="gap-0 max-w-[640px] mx-auto">
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
        {items.length > 0 ? (
          <ul>
            {items.map((user) => (
              <UserListItem key={user.user_id} user={user} />
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