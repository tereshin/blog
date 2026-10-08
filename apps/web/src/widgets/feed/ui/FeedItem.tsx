import type { ReactNode } from 'react'
import { ArticleCard } from '@/entities/article'
import type { ArticleCardModel, ArticleViewerState } from '@/entities/article'

const EMPTY_VIEWER_STATE: ArticleViewerState = { my_reaction: null, is_bookmarked: false }

/** Слоты, которыми сценарии подключают свои действия к карточке, не меняя ленту. */
export type FeedSlots = {
  renderReactions?: (article: ArticleCardModel, viewer_state: ArticleViewerState) => ReactNode
  renderBookmark?: (article: ArticleCardModel, viewer_state: ArticleViewerState) => ReactNode
  renderShare?: (article: ArticleCardModel) => ReactNode
  renderFollow?: (article: ArticleCardModel) => ReactNode
  renderMenu?: (article: ArticleCardModel) => ReactNode
  renderExpand?: (article: ArticleCardModel) => ReactNode
}

type FeedItemProps = { article: ArticleCardModel; viewer_state?: ArticleViewerState; slots: FeedSlots }

/** Карточка ленты в порядке FR-060: автор, заголовок, фрагмент, изображение, раскрытие, реакции, действия, комментарий. */
export function FeedItem({ article, viewer_state = EMPTY_VIEWER_STATE, slots }: FeedItemProps) {
  return (
    <ArticleCard article={article}>
      <ArticleCard.Header follow={slots.renderFollow?.(article)} menu={slots.renderMenu?.(article)} />
      <ArticleCard.Title />
      <ArticleCard.Excerpt />
      <ArticleCard.Image />
      <ArticleCard.Expand>{slots.renderExpand?.(article)}</ArticleCard.Expand>
      <ArticleCard.Reactions>{slots.renderReactions?.(article, viewer_state)}</ArticleCard.Reactions>
      <ArticleCard.Actions bookmark={slots.renderBookmark?.(article, viewer_state)} share={slots.renderShare?.(article)} />
      <ArticleCard.CommentPeek />
    </ArticleCard>
  )
}
