import type { ProfileBadge, UpdateProfile } from '@blog/contracts'

export type ProfileRecord = {
  user_id: string
  public_number: number
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  status_icon_id: string | null
  slug: string | null
  reputation: number
  created_at: Date
  followers_count: number
  following_count: number
  badges: string[]
  is_following: boolean
}

export type ProfileRepositoryPort = {
  findBySlug: (slug: string, viewer_id: string | undefined) => Promise<ProfileRecord | null>
  findByPublicNumber: (public_number: number, viewer_id: string | undefined) => Promise<ProfileRecord | null>
  update: (user_id: string, input: UpdateProfile, correlation_id: string) => Promise<ProfileRecord | null>
}

export type { ProfileBadge }
