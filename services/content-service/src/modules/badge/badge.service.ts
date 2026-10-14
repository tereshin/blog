import { ValidationError } from '@blog/errors'
import type { BadgeDefinition } from '@blog/contracts'
import type { BadgeFacts, BadgeRepository, BadgeService } from './badge.types.ts'

/** UTC calendar arithmetic, clamping leap days and the end of the month. */
export function addCalendarMonths(created_at: Date, months: number): Date {
  const result = new Date(created_at)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const last_day = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate()
  result.setUTCDate(Math.min(day, last_day))
  return result
}

export function qualifiesForBadge(badge: BadgeDefinition, facts: BadgeFacts, now: Date): boolean {
  if (badge.status !== 'active') return false
  const { metric, threshold } = badge.trigger
  switch (metric) {
    case 'published_posts':
      return facts.published_posts >= threshold
    case 'reputation':
      return facts.reputation >= threshold
    case 'membership_months':
      return addCalendarMonths(facts.created_at, threshold) <= now
  }
}

export function createBadgeService(repository: BadgeRepository): BadgeService {
  const evaluateMany = async (user_ids: string[], now = new Date()) => {
    if (user_ids.length === 0) return
    const definitions = await repository.definitions()
    if (!definitions.some((badge) => badge.status === 'active')) return
    const facts = await repository.facts(user_ids)
    const awards = facts.flatMap((user) =>
      definitions
        .filter((badge) => qualifiesForBadge(badge, user, now))
        .map((badge) => ({ user_id: user.user_id, badge_id: badge.id })),
    )
    if (awards.length > 0) await repository.award(awards, now)
  }
  return {
    evaluate: (user_id: string, now = new Date()) => evaluateMany([user_id], now),
    evaluateMany,
    async validateReplacement(next) {
      const previous = await repository.definitions(true)
      if (next === undefined) return previous
      const removed_ids = previous
        .filter((badge) => !next.some((item) => item.id === badge.id))
        .map((badge) => badge.id)
      if (await repository.hasAwards(removed_ids)) {
        throw new ValidationError({
          message: 'Выданные бейджи можно архивировать, но нельзя удалять',
        })
      }
      return next
    },
  }
}
