import { requestSiteCover } from '../social-cover/index.ts'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  faviconSettingsSchema,
  profileStatusIconsSchema,
  reactionAppearancesSchema,
  seoSettingsSchema,
  socialCoverSettingsSchema,
} from '@blog/contracts'
import type {
  FaviconSettings,
  ProfileStatusIcon,
  ReactionAppearances,
  SeoSettings,
  SocialCoverSettings,
} from '@blog/contracts'
import type { Database } from '@blog/broker'
import { settings } from '../../infra/db/schema.ts'
import { appendSettingsUpdated } from './settings.events.ts'

export type SettingsRow = {
  name: string
  logo_url: string | null
  logo_dark_url?: string | null
  favicon?: FaviconSettings
  locale: 'ru' | 'en' | 'sr'
  about: string
  registration_open: boolean
  new_members_can_publish: boolean
  reaction_appearances: ReactionAppearances
  profile_status_icons: ProfileStatusIcon[]
  seo?: SeoSettings
  social_cover?: SocialCoverSettings
}

const columns = {
  name: settings.name,
  logo_url: settings.logo_url,
  logo_dark_url: settings.logo_dark_url,
  favicon: settings.favicon,
  locale: settings.locale,
  about: settings.about,
  registration_open: settings.registration_open,
  new_members_can_publish: settings.new_members_can_publish,
  reaction_appearances: settings.reaction_appearances,
  profile_status_icons: settings.profile_status_icons,
  seo: settings.seo,
  social_cover: settings.social_cover,
}

function readRow(row: SettingsRow): SettingsRow {
  return {
    ...row,
    favicon: faviconSettingsSchema.parse(row.favicon ?? {}),
    seo: seoSettingsSchema.parse(row.seo ?? {}),
    social_cover: socialCoverSettingsSchema.parse(row.social_cover ?? {}),
    reaction_appearances: reactionAppearancesSchema.parse(row.reaction_appearances),
    profile_status_icons: profileStatusIconsSchema.parse(row.profile_status_icons),
  }
}

export type SettingsRepository = {
  find: () => Promise<SettingsRow | null>
  save: (input: SettingsRow, correlation_id: string) => Promise<SettingsRow>
  /** Вставляет строку `id = 1`, если её нет, и публикует событие. Повтор ничего не пишет. */
  insertIfAbsent: (input: SettingsRow, correlation_id: string) => Promise<SettingsRow | null>
}

export function createSettingsRepository(db: NodePgDatabase): SettingsRepository {
  return {
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
