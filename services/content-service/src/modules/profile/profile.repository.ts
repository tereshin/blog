import { eq, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import { profiles, users_copy } from '../../infra/db/schema.ts'
import { releaseSlug, replaceSlug } from '../slug/index.ts'
import { appendProfileUpdated } from './profile.events.ts'
import type { ProfileRecord, ProfileRepository } from './profile.types.ts'
import type { UpdateProfile } from '@blog/contracts'

function selection(viewer_id: string | undefined) {
  const following = viewer_id
    ? sql<boolean>`exists (select 1 from follows where follower_id = ${viewer_id} and target_type = 'user' and target_id = ${profiles.user_id})`
    : sql<boolean>`false`
  return {
    user_id: profiles.user_id,
    public_number: users_copy.public_number,
    display_name: profiles.display_name,
    bio: profiles.bio,
    avatar_url: profiles.avatar_url,
    cover_url: profiles.cover_url,
    status_icon_id: profiles.status_icon_id,
    slug: profiles.slug,
    reputation: profiles.reputation,
    created_at: users_copy.created_at,
    followers_count: sql<number>`(select count(*)::int from follows where target_type = 'user' and target_id = ${profiles.user_id})`,
    following_count: sql<number>`(select count(*)::int from follows where follower_id = ${profiles.user_id})`,
    has_published: sql<boolean>`exists (select 1 from articles where author_id = ${profiles.user_id} and status = 'published')`,
    is_following: following,
  }
}

function toRecord(row: {
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
  has_published: boolean
  is_following: boolean
}): ProfileRecord {
  return row
}

export function createProfileRepository(db: NodePgDatabase): ProfileRepository {
  const load = async (where: SQL, viewer_id: string | undefined) => {
    const [row] = await db
      .select(selection(viewer_id))
      .from(profiles)
      .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
      .where(where)
      .limit(1)
    return row ? toRecord(row) : null
  }

  return {
    findBySlug: (slug, viewer_id) => load(eq(profiles.slug, slug) as SQL, viewer_id),
    findByPublicNumber: (public_number, viewer_id) => load(eq(users_copy.public_number, public_number) as SQL, viewer_id),

    async update(user_id, input: UpdateProfile, correlation_id) {
      return (db as Database).transaction(async (tx) => {
        const database = tx as Database
        if (input.slug === null) await releaseSlug(database, 'profile', user_id)
        else if (input.slug !== undefined) await replaceSlug(database, input.slug, 'profile', user_id)
        const [row] = await database
          .update(profiles)
          .set(input)
          .where(eq(profiles.user_id, user_id))
          .returning({ user_id: profiles.user_id })
        if (!row) return null
        const [fresh] = await database
          .select(selection(user_id))
          .from(profiles)
          .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
          .where(eq(profiles.user_id, user_id))
          .limit(1)
        if (!fresh) return null
        await appendProfileUpdated(database, {
          user_id,
          display_name: fresh.display_name,
          avatar_url: fresh.avatar_url,
          slug: fresh.slug,
          correlation_id,
        })
        return toRecord(fresh)
      })
    },
  }
}
