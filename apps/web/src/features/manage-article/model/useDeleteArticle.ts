import { useMutation, useQueryClient } from '@tanstack/react-query'
import { articleKeys, deleteArticle } from '@/entities/article'
import { profileKeys } from '@/entities/profile'

export function useDeleteArticle() {
  const query_client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: async () => {
      await query_client.invalidateQueries({ queryKey: articleKeys.lists() })
      await query_client.invalidateQueries({ queryKey: profileKeys.all })
    },
  })
}
