import { useShortArticles } from '../model/useShortArticles.ts'
import type { SearchArticle } from '@/entities/search'
import { ArticleFeedItem } from '@/widgets/feed'

type ShortArticlesProps = { articles: SearchArticle[] }

export function ShortArticles({ articles }: ShortArticlesProps) {
  const { states } = useShortArticles(articles)
  return (
    <ol className="flex flex-col gap-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleFeedItem article={article} viewer_state={states.get(article.id)} />
        </li>
      ))}
    </ol>
  )
}
