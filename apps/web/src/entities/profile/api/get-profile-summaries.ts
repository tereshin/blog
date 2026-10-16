import { useQuery } from '@tanstack/react-query'
import { adminDirectorySchema } from '@blog/contracts'
import { http } from '@/shared/api'

export function useProfileSummaries(user_ids: string[]) {
  const ids = [...new Set(user_ids)].sort()
  return useQuery({
    queryKey: ['profile-summaries', ids],
    queryFn: async ({ signal }) => {
      const batches: string[][] = []
      for (let offset = 0; offset < ids.length; offset += 100)
        batches.push(ids.slice(offset, offset + 100))
      const pages = await Promise.all(
        batches.map((batch) =>
          http.get('/v1/admin/profiles', adminDirectorySchema, {
            query: { ids: batch.join(','), limit: 100 },
            signal,
          }),
        ),
      )
      return pages.flat()
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  })
}
