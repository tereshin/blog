import { useMutation, useQueryClient } from '@tanstack/react-query'
import { articleKeys } from '@/entities/article'
import { commentKeys, reviewCommentReport } from '@/entities/comment'
import { seoKeys } from '@/entities/seo'
import { reviewReport } from '../api/moderation.ts'
import { moderationKeys } from './moderation-keys.ts'
export function useReviewReport(kind: 'article' | 'comment') {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'dismiss' | 'hide' | 'delete' }): Promise<void> => {
      await (kind === 'article' ? reviewReport(id, action) : reviewCommentReport(id, action))
    },
    onSuccess: async () => {
      await Promise.all(
        [moderationKeys.all, articleKeys.all, commentKeys.all, seoKeys.all].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      )
    },
  })
}
