import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { articleKeys, mapFeedCards } from '@/entities/article'
import type { ArticleViewerState } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { ApiError, http, sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { z } from 'zod'

const stateSchema = z.object({
  article_id: z.string(),
  bookmark_count: z.number(),
  is_bookmarked: z.boolean(),
})

type BookmarkTarget = { article_id: string; slug: string; count: number; is_bookmarked: boolean }

function patch(queryClient: QueryClient, target: BookmarkTarget, next: { count: number; is_bookmarked: boolean }): void {
  queryClient.setQueriesData({ queryKey: articleKeys.lists() }, (data) =>
    mapFeedCards(data, (card) => (card.id === target.article_id ? { ...card, bookmark_count: next.count } : card)),
  )
  queryClient.setQueriesData<Record<string, ArticleViewerState>>({ queryKey: [...articleKeys.all, 'states'] }, (data) => {
    if (!data) return data
    const current = data[target.article_id]
    return { ...data, [target.article_id]: { my_reaction: current?.my_reaction ?? null, is_bookmarked: next.is_bookmarked } }
  })
}

/** Поставить или снять закладку. Гость видит диалог входа, число откатывается при отказе сервера. */
export function useBookmark(target: BookmarkTarget): { toggle: () => void; is_pending: boolean } {
  const queryClient = useQueryClient()
  const { viewer } = useViewer()
  const toast = useToast()
  const { t } = useT()
  const mutation = useMutation({
    mutationFn: (bookmarked: boolean) => {
      const path = `/v1/bookmarks/${target.article_id}`
      return bookmarked ? http.put(path, stateSchema) : http.delete(path, stateSchema)
    },
    onMutate: async (bookmarked) => {
      await queryClient.cancelQueries({ queryKey: articleKeys.all })
      const previous = queryClient.getQueriesData({ queryKey: articleKeys.all })
      const delta = bookmarked === target.is_bookmarked ? 0 : bookmarked ? 1 : -1
      patch(queryClient, target, { count: Math.max(0, target.count + delta), is_bookmarked: bookmarked })
      return { previous }
    },
    onError: (error, _bookmarked, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data)
      const restricted = error instanceof ApiError && error.code === 'restricted'
      toast.error(restricted ? t('bookmark.restricted') : t('bookmark.failed'))
    },
    onSuccess: (response) => {
      patch(queryClient, target, { count: response.bookmark_count, is_bookmarked: response.is_bookmarked })
      void queryClient.invalidateQueries({ queryKey: articleKeys.bookmarks() })
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
