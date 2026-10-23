import { eq } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import {
  badgeDefinitionsSchema,
  faviconSettingsSchema,
  profileStatusIconsSchema,
  reactionAppearancesSchema,
  seoSettingsSchema,
  shellVisibilitySchema,
  socialCoverSettingsSchema,
} from '@blog/contracts'
import { DEFAULT_PROFILE_BADGES } from '../../shared/profile-badges.ts'
import { settings } from '../../infra/db/schema.ts'
import { appendSettingsUpdated } from './settings.events.ts'
import type { SettingsRepositoryPort, SettingsRow } from './settings.types.ts'

const COLUMNS = {
  meta_pixel_id: settings.meta_pixel_id,
  welcome_content: settings.welcome_content,
  name: settings.name,
  logo_url: settings.logo_url,
  logo_dark_url: settings.logo_dark_url,
  favicon: settings.favicon,
  locale: settings.locale,
  maintenance_enabled: settings.maintenance_enabled,
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

export class SettingsRepository implements SettingsRepositoryPort<Database> {
  constructor(private readonly db: Database) {}

  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(tx))
  }

  async findMaintenance() {
    const [row] = await this.db
      .select({ maintenance_enabled: settings.maintenance_enabled, locale: settings.locale })
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1)
    return row ?? null
  }

  async find(): Promise<SettingsRow | null> {
    const [row] = await this.db.select(COLUMNS).from(settings).where(eq(settings.id, 1)).limit(1)
    return row ? readRow(row) : null
  }

  async insertIfAbsent(tx: Database, input: SettingsRow): Promise<SettingsRow | null> {
    const [row] = await tx
      .insert(settings)
      .values({ id: 1, ...input })
      .onConflictDoNothing()
      .returning(COLUMNS)
    return row ? readRow(row) : null
  }

  async save(tx: Database, input: SettingsRow): Promise<SettingsRow> {
    const [row] = await tx
      .insert(settings)
      .values({ id: 1, ...input })
      .onConflictDoUpdate({ target: settings.id, set: input })
      .returning(COLUMNS)
    if (!row) throw new Error('settings row was not written')
    return readRow(row)
  }

  appendUpdated(tx: Database, input: SettingsRow, correlation_id: string): Promise<void> {
    return appendSettingsUpdated(tx, { ...input, correlation_id })
  }
}
