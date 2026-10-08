import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { getArticleStates } from '../api/get-article-states.ts'
import { articleKeys } from './article-keys.ts'
import type { ArticleViewerState } from './article-types.ts'

const CHUNK = 50

function chunksOf(article_ids: readonly string[]): string[][] {
  const unique = [...new Set(article_ids)].sort()
  const chunks: string[][] = []
  for (let index = 0; index < unique.length; index += CHUNK) chunks.push(unique.slice(index, index + CHUNK))
  return chunks
}

/** Состояния зрителя для карточек на экране. Гость запрос не делает. */
export function useArticleStates(article_ids: readonly string[], is_member: boolean): ReadonlyMap<string, ArticleViewerState> {
  const ids_key = article_ids.join('|')
  const chunks = useMemo(() => chunksOf(ids_key ? ids_key.split('|') : []), [ids_key])
  const queries = useQueries({
    queries: chunks.map((ids) => ({
      queryKey: articleKeys.states(ids),
      queryFn: ({ signal }: { signal: AbortSignal }) => getArticleStates(ids, signal),
      enabled: is_member && ids.length > 0,
    })),
  })
  const states = new Map<string, ArticleViewerState>()
  for (const query of queries) {
    if (!query.data) continue
    for (const [id, state] of Object.entries(query.data)) states.set(id, state)
  }
  return states
}
