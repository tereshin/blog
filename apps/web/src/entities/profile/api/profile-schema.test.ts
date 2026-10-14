import { describe, expect, it } from 'vitest'
import { profileSchema, toProfile } from './profile-schema.ts'

const PROFILE = {
  user_id: 'user', public_number: 1, display_name: 'Author', bio: null,
  avatar_url: null, cover_url: null, slug: 'author', reputation: 0,
  created_at: '2026-10-14T00:00:00Z', followers_count: 0, following_count: 0,
  badges: ['first_post'], is_own: false, is_following: false,
}
const BADGE_ID = '11111111-1111-4111-8111-111111111111'

describe('profile badge API compatibility', () => {
  it('falls back to the legacy field with an older server', () => {
    expect(toProfile(profileSchema.parse(PROFILE)).badges).toEqual(['first_post'])
  })
  it('prefers full awards, including an explicitly empty list', () => {
    expect(toProfile(profileSchema.parse({ ...PROFILE, badge_ids: ['first_post', BADGE_ID] })).badges).toEqual(['first_post', BADGE_ID])
    expect(toProfile(profileSchema.parse({ ...PROFILE, badge_ids: [] })).badges).toEqual([])
  })
})
