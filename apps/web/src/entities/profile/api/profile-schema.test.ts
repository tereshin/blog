import { describe, expect, it } from 'vitest'
import { profileSchema, toProfile } from './profile-schema.ts'

const PROFILE = {
  user_id: 'user',
  public_number: 1,
  display_name: 'Author',
  bio: null,
  avatar_url: null,
  cover_url: null,
  slug: 'author',
  reputation: 0,
  created_at: '2026-10-14T00:00:00Z',
  followers_count: 0,
  following_count: 0,
  badges: ['first_post'],
  is_own: false,
  is_following: false,
}
const BADGE_ID = '11111111-1111-4111-8111-111111111111'

describe('profile badge API', () => {
  it('accepts built-in and configurable award IDs through one field', () => {
    expect(
      toProfile(profileSchema.parse({ ...PROFILE, badges: ['first_post', BADGE_ID] })).badges,
    ).toEqual(['first_post', BADGE_ID])
    expect(toProfile(profileSchema.parse({ ...PROFILE, badges: [] })).badges).toEqual([])
  })
  it('rejects invalid IDs at the API boundary', () => {
    expect(profileSchema.safeParse({ ...PROFILE, badges: ['invalid'] }).success).toBe(false)
  })
})
