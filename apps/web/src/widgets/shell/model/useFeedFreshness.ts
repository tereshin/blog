import { useInfiniteQuery } from '@tanstack/react-query'
import { articleKeys, getFeed } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { useShellStore } from './useShellStore.ts'

function isUnseen(published_at: string | null | undefined, seen_at: string | null): boolean {
  if (!published_at) return false
  if (!seen_at) return true
  return Date.parse(published_at) > Date.parse(seen_at)
}

function useFirstPublishedAt(mode: 'fresh' | 'mine', enabled: boolean): string | null {
  const query = useInfiniteQuery({
    queryKey: articleKeys.list(mode),
    queryFn: ({ pageParam, signal }) => getFeed({ mode, cursor: pageParam, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    select: (data) => data.pages[0]?.items[0]?.published_at ?? null,
    enabled,
  })
  return query.data ?? null
}

/** Синие точки «есть новое» у «Свежего» и «Моей ленты»: первая карточка новее последнего открытия режима. */
export function useFeedFreshness(): { fresh: boolean; mine: boolean } {
  const is_member = useViewer().viewer.status === 'member'
  const seen = useShellStore((state) => state.feed_seen_at)
  const fresh_at = useFirstPublishedAt('fresh', true)
  const mine_at = useFirstPublishedAt('mine', is_member)
  return { fresh: isUnseen(fresh_at, seen.fresh), mine: is_member && isUnseen(mine_at, seen.mine) }
}
