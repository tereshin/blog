import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { http } from '@/shared/api'

const seenSchema = z.object({
  feed_key: z.string(),
  article_id: z.string(),
})
const seenListSchema = z.object({ article_ids: z.array(z.string()) })

export const seenKeys = {
  all: ['feed-seen'] as const,
  list: (feed_key: string) => [...seenKeys.all, feed_key] as const,
}

function dismissedKey(feed_key: string): string {
  return `bannerDismissed:${feed_key}`
}

/** Просмотры этого захода. Сбрасываются при уходе с ленты, чтобы следующий заход спрятал карточки. */
const marked_by_feed = new Map<string, Set<string>>()

function visitIds(feed_key: string): Set<string> {
  const existing = marked_by_feed.get(feed_key)
  if (existing) return existing
  const created = new Set<string>()
  marked_by_feed.set(feed_key, created)
  return created
}

/** Запоминает просмотр, не пряча карточку в этом же заходе: полоса появится при следующем открытии ленты. */
export async function markSeenArticle(feed_key: string, article_id: string): Promise<void> {
  await http.put('/v1/feed-seen', seenSchema, { body: { feed_key, article_id } })
}

/** Просмотренные карточки режима и полоса «Скрыто N». */
export function useSeenArticles(feed_key: string, auto_reveal_ids: readonly string[] = []) {
  const queryClient = useQueryClient()
  const [banner_key, setBannerKey] = useState(feed_key)
  const [reveal_mode, setRevealMode] = useState<'hidden' | 'manual' | 'automatic'>('hidden')
  const [is_dismissed, setDismissed] = useState(() => sessionStorage.getItem(dismissedKey(feed_key)) === '1')
  if (banner_key !== feed_key) {
    setBannerKey(feed_key)
    setDismissed(sessionStorage.getItem(dismissedKey(feed_key)) === '1')
    setRevealMode('hidden')
  }
  const query = useQuery({
    queryKey: seenKeys.list(feed_key),
    queryFn: ({ signal }) => http.get('/v1/feed-seen', seenListSchema, { query: { feed_key }, signal }),
  })
  const server_ids = query.data?.article_ids ?? []
  const seen_ids = new Set(server_ids.filter((id) => !visitIds(feed_key).has(id)))

  // Не оставляем пустой экран, если вся загруженная порция уже просмотрена.
  // Раскрытие сохраняется при подгрузке следующих порций, чтобы список не прыгал.
  if (reveal_mode === 'hidden' && auto_reveal_ids.length > 0 && auto_reveal_ids.every((id) => seen_ids.has(id))) {
    setRevealMode('automatic')
  }

  useEffect(() => {
    return () => {
      marked_by_feed.delete(feed_key)
    }
  }, [feed_key])

  const mark = useCallback(
    (article_id: string) => {
      visitIds(feed_key).add(article_id)
      queryClient.setQueryData(seenKeys.list(feed_key), (current: { article_ids: string[] } | undefined) => {
        const article_ids = current?.article_ids ?? []
        return article_ids.includes(article_id) ? current : { article_ids: [...article_ids, article_id] }
      })
      void markSeenArticle(feed_key, article_id)
    },
    [feed_key, queryClient],
  )

  return {
    seen_ids,
    is_revealed: reveal_mode !== 'hidden',
    is_auto_revealed: reveal_mode === 'automatic',
    reveal: () => setRevealMode('manual'),
    is_dismissed,
    dismiss: () => {
      sessionStorage.setItem(dismissedKey(feed_key), '1')
      setDismissed(true)
      setRevealMode('hidden')
    },
    mark,
  }
}
