import { useArticleStates } from '@/entities/article'
import type { SearchArticle } from '@/entities/search'
import { useViewer } from '@/entities/session'

export function useShortArticles(articles: SearchArticle[]) {
  const { viewer } = useViewer()
  const states = useArticleStates(
    articles.map((article) => article.id),
    viewer.status === 'member',
  )
  return { states }
}
