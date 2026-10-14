import { useInfiniteQuery } from '@tanstack/react-query'
import { articleKeys, getBookmarks, useArticleStates } from '@/entities/article'
import { useViewer } from '@/entities/session'

export function useBookmarks() {
  const { viewer, is_own } = useViewer()
  const is_member = viewer.status === 'member'
  const query = useInfiniteQuery({
    queryKey: articleKeys.bookmarks(),
    queryFn: ({ pageParam, signal }) => getBookmarks(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: is_member,
  })
  const articles = (query.data?.pages ?? []).flatMap((page) => page.items)
  const states = useArticleStates(
    articles.map((article) => article.id),
    is_member,
  )
  const visible = articles.filter((article) => states.get(article.id)?.is_bookmarked !== false)
  return { viewer, is_own, query, states, visible }
}
