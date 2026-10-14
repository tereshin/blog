import { followStatesSchema } from '@blog/contracts'
import { http } from '@/shared/api'

export function getFollowStates(target_type: 'user' | 'topic', target_ids: string[], signal: AbortSignal) {
  return http.get('/v1/me/follows', followStatesSchema, {
    query: { target_type, target_ids: target_ids.join(',') },
    signal,
  })
}
