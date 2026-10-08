import { DAY_MS, at } from './anchor.ts'
import { articleId } from './articles.ts'
import { seedId } from './ids.ts'
import { userId } from './participants.ts'
import type { SeedReport } from './types.ts'

/** Жалобы: на опубликованные статьи (открытые и рассмотренные) и на скрытую модератором. */
export function buildReports(anchor: Date): SeedReport[] {
  const report = (key: string, article_key: string, reporter: string, days_ago: number, status: 'open' | 'reviewed'): SeedReport => ({
    id: seedId('report', key),
    article_id: articleId(article_key),
    reporter_id: userId(reporter),
    created_at: at(anchor, -days_ago * DAY_MS),
    status,
  })
  return [
    report('long-by-reader', 'published_long_with_image', 'reader', 1, 'open'),
    report('short-by-no-publish', 'published_short', 'no_publish', 2, 'open'),
    report('promoted-by-admin', 'published_promoted', 'admin', 15, 'reviewed'),
    report('hidden-by-reader', 'hidden_by_moderator', 'reader', 6, 'reviewed'),
  ]
}
