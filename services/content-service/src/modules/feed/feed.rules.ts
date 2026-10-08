/** Правила отбора и порядка ленты: SQL репозитория обязан совпадать с этими функциями (тест `feed.service.test.ts`). */
export const FEED_PAGE_SIZE = 20
export const POPULAR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type PopularityInput = {
  id: string
  published_at: Date | null
  /** Конец оплаченного продвижения; `null` — продвижения нет. */
  promoted_until: Date | null
  reaction_count: number
  comment_count: number
}

export function popularScore(article: Pick<PopularityInput, 'reaction_count' | 'comment_count'>): number {
  return article.reaction_count + article.comment_count
}

/** «Популярное»: опубликовано за последние 7 суток или продвижение ещё действует. */
export function isPopularCandidate(article: Pick<PopularityInput, 'published_at' | 'promoted_until'>, now: Date): boolean {
  const is_recent = article.published_at !== null && article.published_at.getTime() >= now.getTime() - POPULAR_WINDOW_MS
  const is_promoted = article.promoted_until !== null && article.promoted_until.getTime() > now.getTime()
  return is_recent || is_promoted
}

/** Порядок «Популярного»: счёт по убыванию, затем `id` по убыванию (тот же ключ у курсора). */
export function comparePopular(a: PopularityInput, b: PopularityInput): number {
  const by_score = popularScore(b) - popularScore(a)
  if (by_score !== 0) return by_score
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}
