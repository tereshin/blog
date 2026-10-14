import { DEFAULT_PROFILE_BADGES } from '../../shared/profile-badges.ts'
import { requestAuthorCovers } from '../social-cover/index.ts'
import { eq, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import { profiles, users_copy } from '../../infra/db/schema.ts'
import { SlugRepository, SlugService } from '../slug/index.ts'
import { appendProfileUpdated } from './profile.events.ts'
import type { ProfileRecord, ProfileRepositoryPort } from './profile.types.ts'
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
    badges: sql<string[]>`coalesce((
      select array_agg(a.badge_id order by d.position)
      from profile_badge_awards a
      join jsonb_array_elements(coalesce(
        (select profile_badges from settings where id = 1),
        ${JSON.stringify(DEFAULT_PROFILE_BADGES)}::jsonb
      )) with ordinality as d(badge, position) on d.badge->>'id' = a.badge_id
      where a.user_id = ${profiles.user_id}
    ), array[]::text[])`,
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
  badges: string[]
  is_following: boolean
}): ProfileRecord {
  return row
}

export class ProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}

  private async load(where: SQL, viewer_id: string | undefined) {
    const [row] = await this.db
      .select(selection(viewer_id))
      .from(profiles)
      .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
      .where(where)
      .limit(1)
    return row ? toRecord(row) : null
  }

  findBySlug(slug: string, viewer_id: string | undefined) {
    return this.load(eq(profiles.slug, slug) as SQL, viewer_id)
  }

  findByPublicNumber(public_number: number, viewer_id: string | undefined) {
    return this.load(eq(users_copy.public_number, public_number) as SQL, viewer_id)
  }

  async update(user_id: string, input: UpdateProfile, correlation_id: string) {
    return (this.db as Database).transaction(async (tx) => {
        const database = tx as Database
        const slugs = new SlugService(new SlugRepository())
        if (input.slug === null) await slugs.releaseSlug(database, 'profile', user_id)
        else if (input.slug !== undefined) await slugs.replaceSlug(database, input.slug, 'profile', user_id)
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
        if (input.display_name !== undefined) await requestAuthorCovers(database, user_id, correlation_id)
        return toRecord(fresh)
      })
  }
}
