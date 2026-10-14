import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { articleKeys, mapFeedCards } from '@/entities/article'
import type { ArticleLoad, ArticleViewerState } from '@/entities/article'
import { profileKeys } from '@/entities/profile'
import { useViewer } from '@/entities/session'
import { ApiError, sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { setBookmark } from '../api/bookmark.ts'

type BookmarkTarget = { article_id: string; slug: string; count: number; is_bookmarked: boolean }

function patch(query_client: QueryClient, target: BookmarkTarget, next: { count: number; is_bookmarked: boolean }): void {
  query_client.setQueryData<ArticleLoad>(articleKeys.detail(target.slug), (data) => {
    if (data?.status !== 'ok' || data.article.id !== target.article_id) return data
    return { ...data, article: { ...data.article, bookmark_count: next.count } }
  })
  query_client.setQueriesData({ queryKey: profileKeys.all, predicate: (query) => query.queryKey[2] === 'articles' }, (data) =>
    mapFeedCards(data, (card) => (card.id === target.article_id ? { ...card, bookmark_count: next.count } : card)),
  )
  query_client.setQueriesData({ queryKey: articleKeys.lists() }, (data) =>
    mapFeedCards(data, (card) => (card.id === target.article_id ? { ...card, bookmark_count: next.count } : card)),
  )
  query_client.setQueriesData<Record<string, ArticleViewerState>>({ queryKey: [...articleKeys.all, 'states'] }, (data) => {
    if (!data) return data
    const current = data[target.article_id]
    return { ...data, [target.article_id]: { my_reaction: current?.my_reaction ?? null, is_bookmarked: next.is_bookmarked } }
  })
}

/** Поставить или снять закладку. Гость видит диалог входа, число откатывается при отказе сервера. */
export function useBookmark(target: BookmarkTarget): { toggle: () => void; is_pending: boolean } {
  const query_client = useQueryClient()
  const { viewer } = useViewer()
  const toast = useToast()
  const { t } = useT()
  const mutation = useMutation({
    mutationFn: (bookmarked: boolean) => setBookmark(target.article_id, bookmarked),
    onMutate: async (bookmarked) => {
      await query_client.cancelQueries({ queryKey: articleKeys.all })
      await query_client.cancelQueries({ queryKey: profileKeys.all, predicate: (query) => query.queryKey[2] === 'articles' })
      const previous_profiles = query_client.getQueriesData({ queryKey: profileKeys.all, predicate: (query) => query.queryKey[2] === 'articles' })
      const previous = query_client.getQueriesData({ queryKey: articleKeys.all })
      const delta = bookmarked === target.is_bookmarked ? 0 : bookmarked ? 1 : -1
      patch(query_client, target, { count: Math.max(0, target.count + delta), is_bookmarked: bookmarked })
      return { previous, previous_profiles }
    },
    onError: (error, _bookmarked, context) => {
      for (const [key, data] of context?.previous ?? []) query_client.setQueryData(key, data)
      for (const [key, data] of context?.previous_profiles ?? []) query_client.setQueryData(key, data)
      const restricted = error instanceof ApiError && error.code === 'restricted'
      toast.error(restricted ? t('bookmark.restricted') : t('bookmark.failed'))
    },
    onSuccess: (response) => {
      patch(query_client, target, { count: response.bookmark_count, is_bookmarked: response.is_bookmarked })
      void query_client.invalidateQueries({ queryKey: articleKeys.bookmarks() })
    },
  })

  return {
    is_pending: mutation.isPending,
    toggle: () => {
      if (viewer.status === 'guest') {
        sessionEvents.emit('login_required')
        return
      }
      if (viewer.status !== 'member') return
      mutation.mutate(!target.is_bookmarked)
    },
  }
}
