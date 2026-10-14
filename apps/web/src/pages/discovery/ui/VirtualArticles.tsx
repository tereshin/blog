import { useVirtualArticles } from '../model/useVirtualArticles.ts'
import type { SearchArticle } from '@/entities/search'
import { ArticleFeedItem } from '@/widgets/feed'

type VirtualArticlesProps = { articles: SearchArticle[] }

export function VirtualArticles({ articles }: VirtualArticlesProps) {
  const { states, virtualizer, scroll_margin, setElement, items } = useVirtualArticles(articles)
  return (
    <ol ref={setElement} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {items.map((item) => {
        const article = articles[item.index]
        if (!article) return null
        return (
          <li
            key={article.id}
            data-index={item.index}
            ref={virtualizer.measureElement}
            aria-posinset={item.index + 1}
            aria-setsize={articles.length}
            className="absolute left-0 top-0 w-full pb-3"
            style={{ transform: `translateY(${item.start - scroll_margin}px)` }}
          >
            <ArticleFeedItem article={article} viewer_state={states.get(article.id)} />
          </li>
        )
      })}
    </ol>
  )
}
