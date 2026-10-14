import { badgeDefinitionsSchema } from '@blog/contracts'
import { DEFAULT_PROFILE_BADGES } from '../../shared/profile-badges.ts'
import { requestSiteCover } from '../social-cover/index.ts'
import { eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  faviconSettingsSchema,
  profileStatusIconsSchema,
  reactionAppearancesSchema,
  seoSettingsSchema,
  shellVisibilitySchema,
  socialCoverSettingsSchema,
} from '@blog/contracts'
import type { Database } from '@blog/broker'
import { settings } from '../../infra/db/schema.ts'
import { appendSettingsUpdated } from './settings.events.ts'

import type { SettingsRepository, SettingsRow } from './settings.types.ts'

const columns = {
  welcome_content: settings.welcome_content,
  name: settings.name,
  logo_url: settings.logo_url,
  logo_dark_url: settings.logo_dark_url,
  favicon: settings.favicon,
  locale: settings.locale,
  registration_open: settings.registration_open,
  new_members_can_publish: settings.new_members_can_publish,
  reaction_appearances: settings.reaction_appearances,
  profile_status_icons: settings.profile_status_icons,
  profile_badges: settings.profile_badges,
  seo: settings.seo,
  social_cover: settings.social_cover,
  shell: settings.shell,
}

function readRow(row: SettingsRow): SettingsRow {
  return {
    ...row,
    profile_badges: badgeDefinitionsSchema.parse(row.profile_badges ?? DEFAULT_PROFILE_BADGES),
    favicon: faviconSettingsSchema.parse(row.favicon ?? {}),
    seo: seoSettingsSchema.parse(row.seo ?? {}),
    social_cover: socialCoverSettingsSchema.parse(row.social_cover ?? {}),
    reaction_appearances: reactionAppearancesSchema.parse(row.reaction_appearances),
    profile_status_icons: profileStatusIconsSchema.parse(row.profile_status_icons),
    shell: shellVisibilitySchema.parse(row.shell ?? {}),
  }
}


export function createSettingsRepository(db: NodePgDatabase): SettingsRepository {
  return {
    async badgeDefinitions(is_exclusive = false) {
      await db.execute(is_exclusive
        ? sql`select pg_advisory_xact_lock(74192832)`
        : sql`select pg_advisory_xact_lock_shared(74192832)`)
      const [row] = await db.select({ badges: settings.profile_badges }).from(settings)
        .where(eq(settings.id, 1)).for(is_exclusive ? 'update' : 'share')
      return row?.badges ?? null
    },
    async find() {
      const [row] = await db.select(columns).from(settings).where(eq(settings.id, 1)).limit(1)
      return row ? readRow(row) : null
    },

    async insertIfAbsent(input, correlation_id) {
      return (db as Database).transaction(async (tx) => {
        const database = tx as Database
        const [row] = await database
          .insert(settings)
          .values({ id: 1, ...input })
          .onConflictDoNothing()
          .returning(columns)
        if (!row) return null
        await appendSettingsUpdated(database, { ...input, correlation_id })
        await requestSiteCover(database, correlation_id)
        return readRow(row)
      })
    },

    async save(input, correlation_id) {
      return (db as Database).transaction(async (tx) => {
        const database = tx as Database
        const [row] = await database
          .insert(settings)
          .values({ id: 1, ...input })
          .onConflictDoUpdate({ target: settings.id, set: input })
          .returning(columns)
        if (!row) throw new Error('settings row was not written')
        await appendSettingsUpdated(database, { ...input, correlation_id })
        await requestSiteCover(database, correlation_id)
        return readRow(row)
      })
    },
  }
}
