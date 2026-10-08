import { http } from '@/shared/api'
import { profileSchema, toProfile, toUpdateBody } from './profile-schema.ts'
import type { Profile, ProfileUpdate } from '../model/profile-types.ts'

export function updateProfile(input: ProfileUpdate): Promise<Profile> {
  return http.put('/v1/profiles/me', profileSchema, { body: toUpdateBody(input) }).then(toProfile)
}
