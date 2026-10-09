import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { articleKeys } from '@/entities/article'
import { http } from '@/shared/api'

const promotionSchema = z.object({
  article_id: z.string(),
  confirmed_at: z.string(),
  until: z.string(),
})

export type PromotionResult = z.infer<typeof promotionSchema>

/** Подтверждает пакет показов и обновляет «Популярное». */
export function usePromoteArticle(article_id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => http.post(`/v1/articles/${article_id}/promotion`, promotionSchema, { body: { package: 'basic' } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: articleKeys.list('popular') })
    },
  })
}
