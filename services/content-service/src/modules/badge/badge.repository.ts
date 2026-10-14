import { eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { profiles, users_copy, profile_badge_awards } from '../../infra/db/schema.ts'
import type { BadgeRepository } from './badge.types.ts'

export function createBadgeRepository(
  db: Database,
  definitions: BadgeRepository['definitions'],
): BadgeRepository {
  return {
    definitions,
    async hasAwards(badge_ids) {
      if (!badge_ids.length) return false
      const [award] = await db
        .select({ badge_id: profile_badge_awards.badge_id })
        .from(profile_badge_awards)
        .where(inArray(profile_badge_awards.badge_id, badge_ids))
        .limit(1)
      return Boolean(award)
    },
    async facts(user_ids) {
      const rows = await db
        .select({
          user_id: profiles.user_id,
          reputation: profiles.reputation,
          created_at: users_copy.created_at,
          published_posts: sql<number>`(select count(*)::int from articles where author_id = ${profiles.user_id} and status = 'published')`,
        })
        .from(profiles)
        .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
        .where(inArray(profiles.user_id, user_ids))
      return rows
    },
    async award(awards, now) {
      // A full batch can earn 500 × 100 badges; stay below PostgreSQL's parameter limit.
      for (let offset = 0; offset < awards.length; offset += 1000) {
        await db
          .insert(profile_badge_awards)
          .values(
            awards.slice(offset, offset + 1000).map((award) => ({ ...award, awarded_at: now })),
          )
          .onConflictDoNothing()
      }
    },
  }
}
