import { http } from '@/shared/api'
import { profileSchema, toProfile } from './profile-schema.ts'
import type { Profile } from '../model/profile-types.ts'

export function getProfile(slug: string, signal?: AbortSignal): Promise<Profile> {
  return http.get(`/v1/profiles/${encodeURIComponent(slug)}`, profileSchema, { signal }).then(toProfile)
}
