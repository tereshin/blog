import type { ArticleCardModel, ArticleViewerState } from '@/entities/article'
import { FeedItem } from './FeedItem.tsx'
import { useArticleFeedSlots } from './useArticleFeedSlots.tsx'

type ArticleFeedItemProps = {
  article: ArticleCardModel
  viewer_state?: ArticleViewerState | undefined
}

export function ArticleFeedItem({ article, viewer_state }: ArticleFeedItemProps) {
  const slots = useArticleFeedSlots()
  return <FeedItem article={article} slots={slots} {...(viewer_state ? { viewer_state } : {})} />
}
