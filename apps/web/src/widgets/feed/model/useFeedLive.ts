import { useQueryClient } from '@tanstack/react-query'
import { articleKeys, getArticlesByIds, mapFeedCards } from '@/entities/article'
import type { FeedMode } from '@/entities/article'
import { useLiveSignals } from '@/shared/api'
import type { LiveFrame } from '@/shared/api'

async function refreshArticles(queryClient: ReturnType<typeof useQueryClient>, frames: readonly LiveFrame[]): Promise<void> {
  const ids = [...new Set(frames.flatMap((frame) => (frame.article_id ? [frame.article_id] : [])))]
  if (ids.length === 0) return
  try {
    const cards = await getArticlesByIds(ids)
    const by_id = new Map(cards.map((card) => [card.id, card]))
    queryClient.setQueriesData({ queryKey: articleKeys.lists() }, (data) => mapFeedCards(data, (card) => by_id.get(card.id) ?? card))
    for (const card of cards) void queryClient.invalidateQueries({ queryKey: articleKeys.detail(card.slug) })
  } catch {
    // Поток — подсказка. Следующее чтение ленты само подтянет числа, если запрос карточек не удался.
  }
}

/**
 * Лента слушает реакции, закладки, просмотры и комментарии и точечно перечитывает затронутые карточки.
 * Кадр несёт `article_id`, а кэш статьи ключуется адресом — адрес берётся из ответа `GET /v1/articles?ids=`.
 */
export function useFeedLive(mode: FeedMode, article_ids: readonly string[]): void {
  const queryClient = useQueryClient()
  useLiveSignals({
    subscribe: { feed_key: mode, article_ids: [...article_ids].sort() },
    on: {
      reaction: (frames) => void refreshArticles(queryClient, frames),
      bookmark: (frames) => void refreshArticles(queryClient, frames),
      view: (frames) => void refreshArticles(queryClient, frames),
      comment: (frames) => void refreshArticles(queryClient, frames),
    },
  })
}
