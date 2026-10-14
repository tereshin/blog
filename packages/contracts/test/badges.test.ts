import { describe, expect, it } from 'vitest'
import {
  badgeDefinitionsSchema,
  profileSchema,
  updateSettingsSchema,
  DEFAULT_REACTION_APPEARANCES,
} from '../src/index.ts'

const BADGE = { id: 'first_post', label: 'Badge', image_url: '/badge.svg', status: 'active', trigger: { metric: 'published_posts', threshold: 1 } } as const

describe('configurable badge contracts', () => {
  it('accepts defaults, UUID awards and an empty catalog', () => {
    expect(badgeDefinitionsSchema.parse([BADGE])).toEqual([BADGE])
    expect(badgeDefinitionsSchema.parse([])).toEqual([])
    expect(
      profileSchema.shape.badge_ids.parse(['first_post', '11111111-1111-4111-8111-111111111111']),
    ).toHaveLength(2)
  })
  it('keeps the legacy badges enum unchanged', () => {
    expect(profileSchema.shape.badges.parse(['first_post', 'one_year'])).toHaveLength(2)
    expect(profileSchema.shape.badges.safeParse(['11111111-1111-4111-8111-111111111111']).success).toBe(false)
  })
  it('rejects duplicate IDs and invalid thresholds', () => {
    const first = [BADGE][0]
    if (!first) throw new Error('Missing default badge')
    expect(badgeDefinitionsSchema.safeParse([first, first]).success).toBe(false)
    for (const threshold of [0, -1, 1.5, 120001]) {
      expect(
        badgeDefinitionsSchema.safeParse([{ ...first, trigger: { ...first.trigger, threshold } }])
          .success,
      ).toBe(false)
    }
  })
  it('does not default the catalog in updates from older clients', () => {
    const parsed = updateSettingsSchema.parse({
      name: 'Blog',
      logo_url: null,
      locale: 'ru',
      registration_open: true,
      new_members_can_publish: true,
      reaction_appearances: DEFAULT_REACTION_APPEARANCES,
    })
    expect(parsed.profile_badges).toBeUndefined()
  })
})
