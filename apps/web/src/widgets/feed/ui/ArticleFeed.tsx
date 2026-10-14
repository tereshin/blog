import type { FeedMode } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { Feed } from './Feed.tsx'
import { FeedEmpty } from './FeedEmpty.tsx'
import { useArticleFeedSlots } from '../model/useArticleFeedSlots.tsx'

function emptyHint(mode: FeedMode): 'feed.topic.empty_hint' | 'feed.mine.empty_hint' | 'feed.empty_hint' {
  if (mode.startsWith('topic:')) return 'feed.topic.empty_hint'
  if (mode === 'mine') return 'feed.mine.empty_hint'
  return 'feed.empty_hint'
}

/** Одинаковые действия опубликованных постов во всех лентах. */
export function ArticleFeed({ mode, feed_key }: { mode: FeedMode; feed_key?: string }) {
  const { t } = useT()
  const slots = useArticleFeedSlots()
  return (
    <Feed
      mode={mode}
      {...(feed_key ? { feed_key } : {})}
      empty={<FeedEmpty description={t(emptyHint(mode))} />}
      {...slots}
    />
  )
}
