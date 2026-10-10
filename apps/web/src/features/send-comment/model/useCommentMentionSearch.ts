import { useQuery } from '@tanstack/react-query'
import { searchCommentMentions } from '@/entities/comment'
export function useCommentMentionSearch(search: string, is_open: boolean) {
  const query = useQuery({
    queryKey: ['comment-mentions', search.trim()],
    queryFn: ({ signal }) => searchCommentMentions(search.trim(), signal),
    enabled: is_open && search.trim().length > 0,
  })
  return query
}
