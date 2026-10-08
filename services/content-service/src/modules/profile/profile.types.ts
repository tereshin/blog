import type { Profile, ProfileBadge, UpdateProfile } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'

export type ProfileRecord = {
  user_id: string
  public_number: number
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string | null
  reputation: number
  created_at: Date
  followers_count: number
  following_count: number
  has_published: boolean
  is_following: boolean
}

export type ProfileRepository = {
  findBySlug: (slug: string, viewer_id: string | undefined) => Promise<ProfileRecord | null>
  findByPublicNumber: (public_number: number, viewer_id: string | undefined) => Promise<ProfileRecord | null>
  update: (user_id: string, input: UpdateProfile, correlation_id: string) => Promise<ProfileRecord | null>
}

export type ProfileService = {
  getBySlug: (viewer: ServiceContext, slug: string) => Promise<Profile>
  updateMe: (viewer: ServiceContext, input: UpdateProfile, correlation_id: string) => Promise<Profile>
}

export type { ProfileBadge }
