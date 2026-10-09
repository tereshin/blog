import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { ArticleLoad } from './article-types.ts'
import { recordView } from '../api/record-view.ts'
import { articleKeys } from './article-keys.ts'

const recorded = new Set<string>()

/**
 * Один запрос просмотра на статью за жизнь вкладки. Повторный вызов эффекта (в том числе Strict Mode)
 * не шлёт второй запрос: окно 30 минут всё равно на сервере.
 */
export function useRecordView(article: { id: string; slug: string } | null, from_moderation: boolean): void {
  const queryClient = useQueryClient()
  const article_id = article?.id ?? null
  const slug = article?.slug ?? null

  useEffect(() => {
    if (!article_id || !slug) return
    const key = `${article_id}:${from_moderation ? 'moderation' : 'read'}`
    if (recorded.has(key)) return
    recorded.add(key)
    void recordView(article_id, from_moderation ? 'moderation' : undefined)
      .then((result) => {
        if (!result.counted) return
        queryClient.setQueryData<ArticleLoad>(articleKeys.detail(slug), (data) => {
          if (!data || data.status !== 'ok' || data.article.id !== article_id) return data
          return { ...data, article: { ...data.article, view_count: result.view_count } }
        })
      })
      .catch(() => {
        recorded.delete(key)
      })
  }, [article_id, slug, from_moderation, queryClient])
}
