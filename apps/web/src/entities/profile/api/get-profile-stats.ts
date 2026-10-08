import { z } from 'zod'
import { http } from '@/shared/api'

export const profileStatsSchema = z.object({
  view_count: z.number().int().nonnegative(),
  reaction_count: z.number().int().nonnegative(),
  followers_count: z.number().int().nonnegative(),
})

export type ProfileStats = z.infer<typeof profileStatsSchema>

export function getProfileStats(signal?: AbortSignal): Promise<ProfileStats> {
  return http.get('/v1/profiles/me/stats', profileStatsSchema, { signal })
}