import { useInfiniteQuery } from '@tanstack/react-query'
import { articleKeys, getFeed } from '@/entities/article'
import type { ArticleCardModel, FeedMode, FeedPageModel } from '@/entities/article'

type FeedData = {
  article_ids: string[]
  article_by_id: ReadonlyMap<string, ArticleCardModel>
  reason: 'no_follows' | null
}

/** Порции склеиваются в один список; повтор id (новая публикация между порциями) отбрасывается. */
function normalize(pages: readonly FeedPageModel[]): FeedData {
  const article_ids: string[] = []
  const article_by_id = new Map<string, ArticleCardModel>()
  for (const page of pages) {
    for (const article of page.items) {
      if (article_by_id.has(article.id)) continue
      article_by_id.set(article.id, article)
      article_ids.push(article.id)
    }
  }
  return { article_ids, article_by_id, reason: pages[0]?.reason ?? null }
}

export type FeedState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; refetch: () => void }
  | ({
      status: 'ok'
      has_next: boolean
      is_fetching_next: boolean
      next_error: boolean
      fetchNext: () => void
      refetch: () => void
    } & FeedData)

/** Лента режима: бесконечный запрос по курсору, нормализованный в `article_ids` и `article_by_id`. */
export function useFeed(mode: FeedMode, enabled = true): FeedState {
  const query = useInfiniteQuery({
    queryKey: articleKeys.list(mode),
    queryFn: ({ pageParam, signal }) => getFeed({ mode, cursor: pageParam, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last_page) => last_page.next_cursor ?? undefined,
    select: (data) => normalize(data.pages),
    enabled,
  })

  if (!enabled && !query.data) return { status: 'idle' }
  if (query.isPending) return { status: 'loading' }
  if (query.isError && !query.data) return { status: 'error', refetch: () => void query.refetch() }
  if (!query.data) return { status: 'loading' }
  return {
    status: 'ok',
    ...query.data,
    has_next: query.hasNextPage,
    is_fetching_next: query.isFetchingNextPage,
    next_error: query.isFetchNextPageError,
    fetchNext: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  }
}
