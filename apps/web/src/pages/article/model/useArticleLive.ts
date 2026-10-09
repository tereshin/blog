import { useQueryClient } from '@tanstack/react-query'
import { articleKeys } from '@/entities/article'
import { commentKeys } from '@/entities/comment'
import { useLiveSignals } from '@/shared/api'

/** Открытая статья слушает правки, комментарии, реакции, просмотры и закладки и перечитывает затронутое. */
export function useArticleLive(slug: string, article_id: string | null): void {
  const queryClient = useQueryClient()
  const refresh_article = () => {
    void queryClient.invalidateQueries({ queryKey: articleKeys.detail(slug) })
  }
  const refresh_cards = () => {
    refresh_article()
    void queryClient.invalidateQueries({ queryKey: articleKeys.lists() })
  }
  const refresh_comments = () => {
    if (article_id) void queryClient.invalidateQueries({ queryKey: commentKeys.list(article_id) })
    void queryClient.invalidateQueries({ queryKey: commentKeys.popular() })
  }

  useLiveSignals({
    subscribe: { article_ids: article_id ? [article_id] : [] },
    on: {
      article: refresh_cards,
      comment: refresh_comments,
      reaction: refresh_article,
      view: refresh_article,
      bookmark: refresh_article,
    },
    onReconnected: () => {
      refresh_article()
      refresh_comments()
    },
  })
}
