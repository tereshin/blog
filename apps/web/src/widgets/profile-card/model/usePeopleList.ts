import { useInfiniteQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { useProfile } from '@/entities/profile'
import type { UserListPage } from '@/entities/user'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'

export function usePeopleList(
  title_key: MessageKey,
  query_key: readonly unknown[],
  load: (slug: string, cursor: string | null, signal: AbortSignal) => Promise<UserListPage>,
) {
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
  return { people, items, title }
}
