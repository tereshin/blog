import { DAY_MS, at } from './anchor.ts'
import { articleId } from './articles.ts'
import { userId } from './participants.ts'
import type { SeedBookmark } from './types.ts'

/** Закладки на публичные статьи разных авторов. */
export function buildBookmarks(anchor: Date): SeedBookmark[] {
  const bookmark = (user: string, article_key: string, days_ago: number): SeedBookmark => ({
    user_id: userId(user),
    article_id: articleId(article_key),
    created_at: at(anchor, -days_ago * DAY_MS),
  })
  return [
    bookmark('reader', 'published_long_with_image', 1),
    bookmark('reader', 'published_promoted', 3),
    bookmark('reader', 'small:003', 4),
    bookmark('admin', 'published_short', 2),
    bookmark('author_b', 'published_with_attachment', 2),
  ]
}
