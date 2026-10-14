import { describe, expect, it, vi } from 'vitest'
import type { BadgeDefinition } from '@blog/contracts'
import {
  addCalendarMonths,
  createBadgeService,
  qualifiesForBadge,
} from '../../src/modules/badge/index.ts'

const facts = {
  user_id: 'user',
  published_posts: 2,
  reputation: 10,
  created_at: new Date('2024-02-29T15:30:00Z'),
}
const badge = (
  metric: BadgeDefinition['trigger']['metric'],
  threshold: number,
): BadgeDefinition => ({
  id: 'first_post',
  label: 'Badge',
  image_url: '/badges/first_post.svg',
  status: 'active',
  trigger: { metric, threshold },
})

describe('badge achievement rules', () => {
  it.each([
    ['published_posts', 2],
    ['reputation', 10],
  ] as const)('checks inclusive %s threshold', (metric, threshold) => {
    expect(qualifiesForBadge(badge(metric, threshold), facts, new Date())).toBe(true)
    expect(qualifiesForBadge(badge(metric, threshold + 1), facts, new Date())).toBe(false)
  })
  it('clamps leap day while preserving UTC time', () => {
    const anniversary = new Date('2025-02-28T15:30:00Z')
    expect(addCalendarMonths(facts.created_at, 12)).toEqual(anniversary)
    expect(
      qualifiesForBadge(badge('membership_months', 12), facts, new Date(anniversary.getTime() - 1)),
    ).toBe(false)
    expect(qualifiesForBadge(badge('membership_months', 12), facts, anniversary)).toBe(true)
  })
  it('clamps month ends without drifting subsequent anniversaries', () => {
    const created = new Date('2024-01-31T23:59:59.123Z')
    expect(addCalendarMonths(created, 1).toISOString()).toBe('2024-02-29T23:59:59.123Z')
    expect(addCalendarMonths(created, 2).toISOString()).toBe('2024-03-31T23:59:59.123Z')
  })
  it('does not issue archived badges', () => {
    expect(
      qualifiesForBadge({ ...badge('reputation', 1), status: 'archived' }, facts, new Date()),
    ).toBe(false)
  })
  it('evaluates a batch with one facts read and one award write', async () => {
    const repository = {
      definitions: vi.fn(async () => [badge('reputation', 10)]),
      facts: vi.fn(async () => [facts, { ...facts, user_id: 'other', reputation: 9 }]),
      hasAwards: vi.fn(async () => false),
      award: vi.fn(async () => {}),
    }
    const now = new Date()
    await createBadgeService(repository).evaluateMany(['user', 'other'], now)
    expect(repository.facts).toHaveBeenCalledExactlyOnceWith(['user', 'other'])
    expect(repository.award).toHaveBeenCalledExactlyOnceWith(
      [{ user_id: 'user', badge_id: 'first_post' }],
      now,
    )
  })
  it('locks the current catalog and rejects deletion of issued awards', async () => {
    const repository = {
      definitions: vi.fn(async () => [badge('reputation', 10)]),
      hasAwards: vi.fn(async () => true),
      facts: vi.fn(async () => []),
      award: vi.fn(async () => {}),
    }
    const service = createBadgeService(repository)
    await expect(service.validateReplacement([])).rejects.toThrow('Выданные бейджи')
    expect(repository.definitions).toHaveBeenCalledWith(true)
    expect(repository.hasAwards).toHaveBeenCalledWith(['first_post'])
    expect(await service.validateReplacement(undefined)).toEqual([badge('reputation', 10)])
    expect(repository.hasAwards).toHaveBeenCalledTimes(1)
  })

})
