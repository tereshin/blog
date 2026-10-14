import { eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { BadgeDefinition } from '@blog/contracts'
import { profiles, settings, users_copy, profile_badge_awards } from '../../infra/db/schema.ts'
import type { BadgeFacts, BadgeRepositoryPort } from './badge.types.ts'

/** Ключ блокировки каталога: замена каталога (exclusive) не пересекается с выдачей (shared). */
const CATALOG_LOCK = 74192832
const AWARD_BATCH_SIZE = 1000

export class BadgeRepository implements BadgeRepositoryPort<Database> {
  async definitions(tx: Database, is_exclusive = false): Promise<BadgeDefinition[] | null> {
    await tx.execute(is_exclusive
      ? sql`select pg_advisory_xact_lock(${sql.raw(String(CATALOG_LOCK))})`
      : sql`select pg_advisory_xact_lock_shared(${sql.raw(String(CATALOG_LOCK))})`)
    const [row] = await tx.select({ badges: settings.profile_badges }).from(settings)
      .where(eq(settings.id, 1)).for(is_exclusive ? 'update' : 'share')
    return row?.badges ?? null
  }

  async hasAwards(tx: Database, badge_ids: string[]): Promise<boolean> {
    if (!badge_ids.length) return false
    const [award] = await tx
      .select({ badge_id: profile_badge_awards.badge_id })
      .from(profile_badge_awards)
      .where(inArray(profile_badge_awards.badge_id, badge_ids))
      .limit(1)
    return Boolean(award)
  }

  facts(tx: Database, user_ids: string[]): Promise<BadgeFacts[]> {
    return tx
      .select({
        user_id: profiles.user_id,
        reputation: profiles.reputation,
        created_at: users_copy.created_at,
        published_posts: sql<number>`(select count(*)::int from articles where author_id = ${profiles.user_id} and status = 'published')`,
      })
      .from(profiles)
      .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
      .where(inArray(profiles.user_id, user_ids))
  }

  async award(tx: Database, awards: { user_id: string; badge_id: string }[], now: Date): Promise<void> {
    // A full batch can earn 500 × 100 badges; stay below PostgreSQL's parameter limit.
    for (let offset = 0; offset < awards.length; offset += AWARD_BATCH_SIZE) {
      await tx
        .insert(profile_badge_awards)
        .values(awards.slice(offset, offset + AWARD_BATCH_SIZE).map((award) => ({ ...award, awarded_at: now })))
        .onConflictDoNothing()
    }
  }
}
