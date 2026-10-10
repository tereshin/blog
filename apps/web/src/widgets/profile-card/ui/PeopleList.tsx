import { useInfiniteQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { useProfile } from '@/entities/profile'
import { UserListItem } from '@/entities/user'
import type { UserListPage } from '@/entities/user'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, EmptyState, ErrorState } from '@/shared/ui'
import { ProfileCard } from './ProfileCard.tsx'

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
    <div className="flex flex-col gap-3">
      <h1 className="px-1 text-xl font-semibold">{title}</h1>
      {people.isPending ? <ProfileCard.Skeleton /> : null}
      {people.isError ? <ErrorState title={t('error.unknown')} onRetry={() => void people.refetch()} /> : null}
      {people.data && items.length === 0 ? <EmptyState title={t('profile.list_empty')} description={t('profile.list_empty_hint')} /> : null}
      {items.length > 0 ? (
        <ul>
          {items.map((user) => (
            <UserListItem key={user.user_id} user={user} />
          ))}
        </ul>
      ) : null}
      {people.hasNextPage ? (
        <Button variant="ghost" onPress={() => void people.fetchNextPage()}>
          {t('common.more')}
        </Button>
      ) : null}
    </div>
  )
}