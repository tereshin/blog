import { at } from './anchor.ts'
import { articleId } from './articles.ts'
import { userId } from './participants.ts'
import type { SeedView } from './types.ts'

const HOUR = 60 * 60 * 1000

export const GUEST_VIEWER_KEY = 'guest:seed-guest-1'
export const userViewerKey = (user_key: string): string => `user:${userId(user_key)}`

/** Просмотры страницы статьи: вошедшие и гость по ключу устройства. Автор свою статью не просматривает. */
export function buildSmallViews(anchor: Date): SeedView[] {
  const view = (viewer_key: string, article_key: string, hours_ago: number): SeedView => ({
    article_id: articleId(article_key),
    viewer_key,
    counted_at: at(anchor, -hours_ago * HOUR),
  })
  const reader = userViewerKey('reader')
  return [
    view(reader, 'published_long_with_image', 6),
    view(reader, 'published_short', 30),
    view(reader, 'published_promoted', 90),
    view(reader, 'published_members_only', 50),
    view(reader, 'small:001', 120),
    view(reader, 'small:002', 118),
    view(userViewerKey('admin'), 'published_long_with_image', 7),
    view(userViewerKey('admin'), 'published_short', 31),
    view(userViewerKey('author_b'), 'published_long_with_image', 9),
    view(userViewerKey('superadmin'), 'published_long_with_image', 11),
    view(GUEST_VIEWER_KEY, 'published_long_with_image', 5),
    view(GUEST_VIEWER_KEY, 'published_short', 28),
    view(GUEST_VIEWER_KEY, 'small:001', 119),
    view(GUEST_VIEWER_KEY, 'small:002', 117),
  ]
}
