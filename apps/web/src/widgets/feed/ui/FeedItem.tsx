import type { ReactNode } from 'react'
import { ArticleCard } from '@/entities/article'
import type { ArticleCardModel } from '@/entities/article'

/** Слоты, которыми сценарии подключают свои действия к карточке, не меняя ленту. */
export type FeedSlots = {
  renderReactions?: (article: ArticleCardModel) => ReactNode
  renderBookmark?: (article: ArticleCardModel) => ReactNode
  renderShare?: (article: ArticleCardModel) => ReactNode
  renderFollow?: (article: ArticleCardModel) => ReactNode
  renderMenu?: (article: ArticleCardModel) => ReactNode
  renderExpand?: (article: ArticleCardModel) => ReactNode
}

type FeedItemProps = { article: ArticleCardModel; slots: FeedSlots }

/** Карточка ленты в порядке FR-060: автор, заголовок, фрагмент, изображение, раскрытие, реакции, действия, комментарий. */
export function FeedItem({ article, slots }: FeedItemProps) {
  return (
    <ArticleCard article={article}>
      <ArticleCard.Header follow={slots.renderFollow?.(article)} menu={slots.renderMenu?.(article)} />
      <ArticleCard.Title />
      <ArticleCard.Excerpt />
      <ArticleCard.Image />
      <ArticleCard.Expand>{slots.renderExpand?.(article)}</ArticleCard.Expand>
      <ArticleCard.Reactions>{slots.renderReactions?.(article)}</ArticleCard.Reactions>
      <ArticleCard.Actions bookmark={slots.renderBookmark?.(article)} share={slots.renderShare?.(article)} />
      <ArticleCard.CommentPeek />
    </ArticleCard>
  )
}
