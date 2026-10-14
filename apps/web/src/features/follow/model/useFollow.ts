import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { articleKeys, mapFeedCards } from '@/entities/article'
import { profileKeys } from '@/entities/profile'
import type { Profile } from '@/entities/profile'
import { useViewer } from '@/entities/session'
import { topicKeys } from '@/entities/topic'
import type { Topic } from '@/entities/topic'
import { ApiError, sessionEvents } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import { setFollow } from '../api/set-follow.ts'
import { followKeys } from './follow-keys.ts'
import { advanceFollowVersion } from './follow-version.ts'

export type FollowTarget = {
  target_type: 'user' | 'topic'
  target_id: string
  is_following: boolean
}

function isProfile(data: unknown): data is Profile {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  return (
    typeof record['user_id'] === 'string' &&
    typeof record['followers_count'] === 'number' &&
    typeof record['is_following'] === 'boolean' &&
    typeof record['is_own'] === 'boolean'
  )
}

function isTopic(data: unknown): data is Topic {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const record = data as Record<string, unknown>
  return (
    typeof record['id'] === 'string' &&
    typeof record['slug'] === 'string' &&
    typeof record['position'] === 'number' &&
    typeof record['is_following'] === 'boolean'
  )
}

function applyFollow(query_client: QueryClient, target: FollowTarget, next: boolean): void {
  const previous =
    query_client.getQueryData<boolean>(followKeys.flag(target.target_type, target.target_id)) ??
    target.is_following
  const delta = next === previous ? 0 : next ? 1 : -1
  query_client.setQueryData(followKeys.flag(target.target_type, target.target_id), next)
  query_client.setQueriesData({ queryKey: profileKeys.all }, (data) => {
    if (!isProfile(data)) return data
    if (target.target_type === 'user' && data.user_id === target.target_id) {
      return {
        ...data,
        is_following: next,
        followers_count: Math.max(0, data.followers_count + delta),
      }
    }
    if (data.is_own) return { ...data, following_count: Math.max(0, data.following_count + delta) }
    return data
  })
  if (target.target_type === 'topic') {
    query_client.setQueriesData({ queryKey: topicKeys.all }, (data) =>
      isTopic(data) && data.id === target.target_id ? { ...data, is_following: next } : data,
    )
  }
  if (target.target_type === 'user') {
    query_client.setQueriesData({ queryKey: articleKeys.lists() }, (data) =>
      mapFeedCards(data, (card) =>
        card.author.user_id === target.target_id ? { ...card, is_following: next } : card,
      ),
    )
  }
}

/** Подписка на автора или тему. Гость видит вход, отказ сервера возвращает прежние числа. */
export function useFollow(target: FollowTarget): {
  is_following: boolean
  toggle: () => void
  is_pending: boolean
} {
  const query_client = useQueryClient()
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
  const pending_count = useIsMutating({
    mutationKey: followKeys.mutation(target.target_type, target.target_id),
  })
  const mutation = useMutation({
    mutationKey: followKeys.mutation(target.target_type, target.target_id),
    mutationFn: (next: boolean) => setFollow(target, next),
    onMutate: async (next) => {
      advanceFollowVersion(query_client, target.target_type, target.target_id)
      await query_client.cancelQueries({
        queryKey: followKeys.flag(target.target_type, target.target_id),
      })
      await query_client.cancelQueries({ queryKey: profileKeys.all })
      await query_client.cancelQueries({ queryKey: topicKeys.all })
      await query_client.cancelQueries({ queryKey: articleKeys.lists() })
      const previous =
        query_client.getQueryData<boolean>(followKeys.flag(target.target_type, target.target_id)) ??
        target.is_following
      applyFollow(query_client, target, next)
      return { previous }
    },
    onError: (error, _next, context) => {
      advanceFollowVersion(query_client, target.target_type, target.target_id)
      if (context) applyFollow(query_client, target, context.previous)
      const restricted = error instanceof ApiError && error.code === 'restricted'
      toast.error(restricted ? t('follow.restricted') : t('follow.failed'))
    },
    onSuccess: (response) => {
      advanceFollowVersion(query_client, target.target_type, target.target_id)
      applyFollow(query_client, target, response.is_following)
    },
  })

  return {
    is_following: flag.data,
    is_pending: mutation.isPending || pending_count > 0,
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
