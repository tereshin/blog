export type ProfileBadge = 'first_post' | 'ten_reactions' | 'one_year'
export type ProfileArticleStatus = 'draft' | 'published' | 'hidden'

export type Profile = {
  user_id: string
  public_number: number
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string | null
  reputation: number
  created_at: string
  followers_count: number
  following_count: number
  badges: ProfileBadge[]
  is_own: boolean
  is_following: boolean
}

export type ProfileUpdate = {
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string | null
}
