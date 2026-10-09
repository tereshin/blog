import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { articleKeys, mapFeedCards } from '@/entities/article'
import { profileKeys } from '@/entities/profile'
import type { Profile } from '@/entities/profile'
import { useViewer } from '@/entities/session'
import { topicKeys } from '@/entities/topic'
import type { Topic } from '@/entities/topic'
import { ApiError, http, sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'

const followStateSchema = z.object({
  target_type: z.enum(['user', 'topic']),
  target_id: z.string(),
  is_following: z.boolean(),
})

export type FollowTarget = {
  target_type: 'user' | 'topic'
  target_id: string
  is_following: boolean
}

export const followKeys = {
  all: ['follows'] as const,
  flag: (target_type: string, target_id: string) => [...followKeys.all, 'flag', target_type, target_id] as const,
}

function isProfile(data: unknown): data is Profile {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  return typeof record['user_id'] === 'string' && typeof record['followers_count'] === 'number' && typeof record['is_following'] === 'boolean' && typeof record['is_own'] === 'boolean'
}

function isTopic(data: unknown): data is Topic {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const record = data as Record<string, unknown>
  return typeof record['id'] === 'string' && typeof record['slug'] === 'string' && typeof record['position'] === 'number' && typeof record['is_following'] === 'boolean'
}

function applyFollow(queryClient: QueryClient, target: FollowTarget, next: boolean): void {
  const previous = queryClient.getQueryData<boolean>(followKeys.flag(target.target_type, target.target_id)) ?? target.is_following
  const delta = next === previous ? 0 : next ? 1 : -1
  queryClient.setQueryData(followKeys.flag(target.target_type, target.target_id), next)
  queryClient.setQueriesData({ queryKey: profileKeys.all }, (data) => {
    if (!isProfile(data)) return data
    if (target.target_type === 'user' && data.user_id === target.target_id) {
      return { ...data, is_following: next, followers_count: Math.max(0, data.followers_count + delta) }
    }
    if (data.is_own) return { ...data, following_count: Math.max(0, data.following_count + delta) }
    return data
  })
  if (target.target_type === 'topic') {
    queryClient.setQueriesData({ queryKey: topicKeys.all }, (data) => (isTopic(data) && data.id === target.target_id ? { ...data, is_following: next } : data))
  }
  if (target.target_type === 'user') {
    queryClient.setQueriesData({ queryKey: articleKeys.lists() }, (data) =>
      mapFeedCards(data, (card) => (card.author.user_id === target.target_id ? { ...card, is_following: next } : card)),
    )
  }
}

/** Подписка на автора или тему. Гость видит вход, отказ сервера возвращает прежние числа. */
export function useFollow(target: FollowTarget): { is_following: boolean; toggle: () => void; is_pending: boolean } {
  const queryClient = useQueryClient()
  const { viewer } = useViewer()
  const toast = useToast()
  const { t } = useT()
  const flag = useQuery({
    queryKey: followKeys.flag(target.target_type, target.target_id),
    queryFn: () => target.is_following,
    initialData: target.is_following,
    staleTime: Infinity,
    enabled: false,
  })
  const mutation = useMutation({
    mutationFn: (next: boolean) => {
      const body = { target_type: target.target_type, target_id: target.target_id }
      return next ? http.put('/v1/follows', followStateSchema, { body }) : http.delete('/v1/follows', followStateSchema, { body })
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: followKeys.all })
      await queryClient.cancelQueries({ queryKey: profileKeys.all })
      await queryClient.cancelQueries({ queryKey: topicKeys.all })
      await queryClient.cancelQueries({ queryKey: articleKeys.lists() })
      const previous = [
        ...queryClient.getQueriesData({ queryKey: followKeys.all }),
        ...queryClient.getQueriesData({ queryKey: profileKeys.all }),
        ...queryClient.getQueriesData({ queryKey: topicKeys.all }),
        ...queryClient.getQueriesData({ queryKey: articleKeys.lists() }),
      ]
      applyFollow(queryClient, target, next)
      return { previous }
    },
    onError: (error, _next, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data)
      const restricted = error instanceof ApiError && error.code === 'restricted'
      toast.error(restricted ? t('follow.restricted') : t('follow.failed'))
    },
    onSuccess: (response) => {
      applyFollow(queryClient, target, response.is_following)
    },
  })

  return {
    is_following: flag.data,
    is_pending: mutation.isPending,
    toggle: () => {
      if (viewer.status === 'guest') {
        sessionEvents.emit('login_required')
        return
      }
      if (viewer.status !== 'member') return
      mutation.mutate(!flag.data)
    },
  }
}
