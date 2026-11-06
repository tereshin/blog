import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { ArticleLoad } from './article-types.ts'
import { recordView } from '../api/record-view.ts'
import { articleKeys } from './article-keys.ts'

/**
 * Один запрос на открытие статьи. Ref защищает от повторного эффекта в Strict Mode,
 * но новое открытие страницы и переход на другую статью засчитываются заново.
 */
export function useRecordView(article: { id: string; slug: string } | null, from_moderation: boolean): void {
  const query_client = useQueryClient()
  const recorded = useRef<string | null>(null)
  const article_id = article?.id ?? null
  const slug = article?.slug ?? null

  useEffect(() => {
    if (!article_id || !slug) return
    if (recorded.current === article_id) return
    recorded.current = article_id
    void recordView(article_id, from_moderation ? 'moderation' : undefined)
      .then((result) => {
        query_client.setQueryData<ArticleLoad>(articleKeys.detail(slug), (data) => {
          if (!data || data.status !== 'ok' || data.article.id !== article_id) return data
          return { ...data, article: { ...data.article, view_count: result.view_count } }
        })
      })
      .catch(() => {
        if (recorded.current === article_id) recorded.current = null
      })
  }, [article_id, slug, from_moderation, query_client])
}
