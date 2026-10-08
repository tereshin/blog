import { at } from './anchor.ts'
import { articleId } from './articles.ts'
import { topicId } from './topics.ts'
import type { FeedMode, SeedFeedSeen } from './types.ts'
import { GUEST_VIEWER_KEY, userViewerKey } from './views.ts'

const HOUR = 60 * 60 * 1000

/** «Просмотренное в ленте»: у читателя — по всем режимам, у гостя — по режимам, доступным без входа. */
export function buildSmallFeedSeen(anchor: Date): SeedFeedSeen[] {
  const seen = (viewer_key: string, feed_key: FeedMode, article_key: string, hours_ago: number): SeedFeedSeen => ({
    viewer_key,
    feed_key,
    article_id: articleId(article_key),
    seen_at: at(anchor, -hours_ago * HOUR),
  })
  const reader = userViewerKey('reader')
  return [
    seen(reader, 'fresh', 'small:001', 120),
    seen(reader, 'fresh', 'small:002', 118),
    seen(reader, 'fresh', 'published_short', 30),
    seen(reader, 'popular', 'published_promoted', 90),
    seen(reader, 'popular', 'published_long_with_image', 6),
    seen(reader, 'mine', 'published_short', 29),
    seen(reader, 'mine', 'published_with_attachment', 100),
    seen(reader, `topic:${topicId('design')}`, 'published_long_with_image', 5),
    seen(GUEST_VIEWER_KEY, 'fresh', 'small:001', 119),
    seen(GUEST_VIEWER_KEY, 'fresh', 'small:002', 117),
    seen(GUEST_VIEWER_KEY, 'popular', 'published_long_with_image', 5),
    seen(GUEST_VIEWER_KEY, `topic:${topicId('engineering')}`, 'published_short', 27),
  ]
}
