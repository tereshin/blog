import { useQuery } from '@tanstack/react-query'
import { getFeed } from '../api/get-feed.ts'
import { articleKeys } from './article-keys.ts'
import type { ArticleCardModel, FeedMode } from './article-types.ts'

/** Первая карточка режима: нужна пилюле в шапке. Один дешёвый запрос, держится минуту. */
export function useFirstArticle(mode: FeedMode): ArticleCardModel | null {
  const { data } = useQuery({
    queryKey: articleKeys.first(mode),
    queryFn: ({ signal }) => getFeed({ mode, signal }),
    staleTime: 60_000,
    select: (page) => page.items[0] ?? null,
  })
  return data ?? null
}
