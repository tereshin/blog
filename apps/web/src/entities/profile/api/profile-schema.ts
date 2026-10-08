import { z } from 'zod'
import type { Profile, ProfileUpdate } from '../model/profile-types.ts'

export const profileSchema = z.object({
  user_id: z.string(),
  public_number: z.number().int(),
  display_name: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  cover_url: z.string().nullable(),
  slug: z.string().nullable(),
  reputation: z.number().int(),
  created_at: z.string(),
  followers_count: z.number().int(),
  following_count: z.number().int(),
  badges: z.array(z.enum(['first_post', 'ten_reactions', 'one_year'])),
  is_own: z.boolean(),
  is_following: z.boolean(),
})

export function toProfile(dto: z.infer<typeof profileSchema>): Profile {
  return dto
}

export function toUpdateBody(input: ProfileUpdate): ProfileUpdate {
  return {
    display_name: input.display_name.trim(),
    bio: input.bio && input.bio.trim().length > 0 ? input.bio.trim() : null,
    avatar_url: input.avatar_url,
    cover_url: input.cover_url,
    slug: input.slug && input.slug.trim().length > 0 ? input.slug.trim().toLowerCase() : null,
  }
}
