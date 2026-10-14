import { useArticleStates } from '@/entities/article'
import type { SearchArticle } from '@/entities/search'
import { useViewer } from '@/entities/session'
import { useWindowList } from '@/shared/lib'

export function useVirtualArticles(articles: SearchArticle[]) {
  const { viewer } = useViewer()
  const { virtualizer, scroll_margin, setElement, items } = useWindowList(
    articles.map((article) => article.id),
    380,
  )
  const visible_ids = items.flatMap((item) => {
    const article = articles[item.index]
    return article ? [article.id] : []
  })
  const states = useArticleStates(visible_ids, viewer.status === 'member')
  return { states, virtualizer, scroll_margin, setElement, items }
}
