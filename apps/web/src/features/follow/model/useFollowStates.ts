import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useViewer } from '@/entities/session'
import { getFollowStates } from '../api/get-follow-states.ts'
import { followKeys } from './follow-keys.ts'
import { beginFollowRead } from './follow-version.ts'

type FollowIdentity = { target_type: 'user' | 'topic'; target_id: string }

/** Only visible targets are requested, in batches bounded by the existing API limit. */
export function useFollowStates(targets: readonly FollowIdentity[]) {
  const { viewer } = useViewer()
  const client = useQueryClient()
  const viewer_id = viewer.status === 'member' ? viewer.user.id : ''
  const batches: { type: 'user' | 'topic'; ids: string[] }[] = []
  for (const type of ['user', 'topic'] as const) {
    const ids = [
      ...new Set(
        targets.filter((target) => target.target_type === type).map((target) => target.target_id),
      ),
    ].sort()
    for (let start = 0; start < ids.length; start += 100)
      batches.push({ type, ids: ids.slice(start, start + 100) })
  }
  const queries = useQueries({
    queries: batches.map(({ type, ids }) => ({
      queryKey: followKeys.batch(viewer_id, type, ids),
      enabled: viewer.status === 'member',
      staleTime: 30_000,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const read = beginFollowRead(client, type, ids)
        try {
          const response = await getFollowStates(type, ids, signal)
          if (!signal.aborted) {
            const states = new Map(
              response.items.map((item) => [item.target_id, item.is_following]),
            )
            ids.forEach((id, index) => {
              if (
                !read.isCurrent(index) ||
                client.isMutating({ mutationKey: followKeys.mutation(type, id) })
              )
                return
              client.setQueryData(followKeys.flag(type, id), states.get(id) ?? false)
            })
          }
          return response
        } finally {
          read.release()
        }
      },
    })),
  })
  return {
    is_pending:
      viewer.status === 'loading' ||
      (viewer.status === 'member' && queries.some((query) => query.isPending)),
    is_error: viewer.status === 'member' && queries.some((query) => query.isError),
    retry: () => {
      queries.filter((query) => query.isError).forEach((query) => void query.refetch())
    },
  }
}
