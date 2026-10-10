import type { FeedMode } from '@/entities/article'
import { Feed } from './Feed.tsx'
import { useArticleFeedSlots } from './useArticleFeedSlots.tsx'

/** Одинаковые действия опубликованных постов во всех лентах. */
export function ArticleFeed({ mode, feed_key }: { mode: FeedMode; feed_key?: string }) {
  const slots = useArticleFeedSlots()
  return <Feed mode={mode} {...(feed_key ? { feed_key } : {})} {...slots} />
}
