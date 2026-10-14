import type { SearchArticle } from '@/entities/search'
import { ShortArticles } from './ShortArticles.tsx'
import { VirtualArticles } from './VirtualArticles.tsx'

type DiscoveryArticleListProps = { articles: SearchArticle[] }

export function DiscoveryArticleList({ articles }: DiscoveryArticleListProps) {
  return articles.length > 100 ? (
    <VirtualArticles articles={articles} />
  ) : (
    <ShortArticles articles={articles} />
  )
}
