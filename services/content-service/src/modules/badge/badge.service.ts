import type { BadgeDefinition } from '@blog/contracts'
import { DEFAULT_PROFILE_BADGES } from '../../shared/profile-badges.ts'
import { AwardedBadgeRemovalError } from './badge.errors.ts'
import type { BadgeFacts, BadgeRepositoryPort } from './badge.types.ts'

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

export class BadgeService<TTx> {
  constructor(private readonly repository: BadgeRepositoryPort<TTx>) {}

  evaluate(tx: TTx, user_id: string, now = new Date()): Promise<void> {
    return this.evaluateMany(tx, [user_id], now)
  }

  async evaluateMany(tx: TTx, user_ids: string[], now = new Date()): Promise<void> {
    if (user_ids.length === 0) return
    const definitions = await this.definitions(tx)
    if (!definitions.some((badge) => badge.status === 'active')) return
    const facts = await this.repository.facts(tx, user_ids)
    const awards = facts.flatMap((user) =>
      definitions
        .filter((badge) => qualifiesForBadge(badge, user, now))
        .map((badge) => ({ user_id: user.user_id, badge_id: badge.id })),
    )
    if (awards.length > 0) await this.repository.award(tx, awards, now)
  }

  /** Блокирует текущий каталог до конца транзакции и не даёт убрать уже выданный бейдж. */
  async validateReplacement(tx: TTx, next: BadgeDefinition[] | undefined): Promise<BadgeDefinition[]> {
    const previous = await this.definitions(tx, true)
    if (next === undefined) return previous
    const removed_ids = previous
      .filter((badge) => !next.some((item) => item.id === badge.id))
      .map((badge) => badge.id)
    if (await this.repository.hasAwards(tx, removed_ids)) throw new AwardedBadgeRemovalError()
    return next
  }

  private async definitions(tx: TTx, is_exclusive = false): Promise<BadgeDefinition[]> {
    return (await this.repository.definitions(tx, is_exclusive)) ?? DEFAULT_PROFILE_BADGES
  }
}
