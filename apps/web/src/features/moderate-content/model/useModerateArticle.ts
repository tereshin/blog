import { useMutation, useQueryClient } from '@tanstack/react-query'
import { articleKeys } from '@/entities/article'
import { commentKeys } from '@/entities/comment'
import { deleteModeratedArticle, deleteModeratedComment, hideArticle, hideComment, restoreArticle, restoreComment } from '../api/moderation.ts'
import { moderationKeys } from './moderation-keys.ts'

export function useModerateArticle() {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: moderationKeys.all })
    void queryClient.invalidateQueries({ queryKey: articleKeys.lists() })
  }
  const hide = useMutation({ mutationFn: (article_id: string) => hideArticle(article_id), onSuccess: refresh })
  const restore = useMutation({ mutationFn: (article_id: string) => restoreArticle(article_id), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (article_id: string) => deleteModeratedArticle(article_id), onSuccess: refresh })
  return { hide, restore, remove }
}

export function useModerateComment(article_id: string) {
  const queryClient = useQueryClient()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: commentKeys.list(article_id) })
    void queryClient.invalidateQueries({ queryKey: commentKeys.popular() })
  }
  return {
    hide: useMutation({ mutationFn: (comment_id: string) => hideComment(comment_id), onSuccess: refresh }),
    restore: useMutation({ mutationFn: (comment_id: string) => restoreComment(comment_id), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (comment_id: string) => deleteModeratedComment(comment_id), onSuccess: refresh }),
  }
}
