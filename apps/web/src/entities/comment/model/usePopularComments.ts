import { useQuery } from '@tanstack/react-query'
import { getPopularComments } from '../api/get-popular-comments.ts'
import { commentKeys } from './comment-keys.ts'

export function usePopularComments() {
  return useQuery({
    queryKey: commentKeys.popular(),
    queryFn: ({ signal }) => getPopularComments(signal),
    staleTime: 30_000,
  })
}
