import { reactionAppearancesSchema } from '@blog/contracts'
import type { AdminSettings, PublicSettings, ReactionAppearances, ServiceContext, UpdateSettings } from '@blog/contracts'
import { requireSuperadmin } from '../access/require-superadmin.ts'
import { assertMediaUrl } from '../media-url.ts'
import { DEFAULT_REACTION_APPEARANCES, assertSingleEmoji } from './reaction-appearance.ts'
import type { SettingsRepository, SettingsRow } from './settings.repository.ts'

export const DEFAULT_SETTINGS: AdminSettings = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  about: '',
  registration_open: true,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
}

function appearancesOf(value: ReactionAppearances): ReactionAppearances {
  return reactionAppearancesSchema.parse(value)
}

function toPublic(row: SettingsRow): PublicSettings {
  return {
    name: row.name,
    logo_url: row.logo_url,
    locale: row.locale,
    about: row.about,
    reaction_appearances: appearancesOf(row.reaction_appearances),
    profile_status_icons: row.profile_status_icons,
  }
}

function toAdmin(row: SettingsRow): AdminSettings {
  return {
    ...toPublic(row),
    registration_open: row.registration_open,
    new_members_can_publish: row.new_members_can_publish,
  }
}

/** Настройки пустой площадки: регистрация закрыта, публиковать новым участникам можно. */
export const BOOTSTRAP_SETTINGS: SettingsRow = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  about: '',
  registration_open: false,
  new_members_can_publish: true,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
}

export type SettingsService = {
  getPublic: () => Promise<PublicSettings>
  getAdmin: (viewer: ServiceContext) => Promise<AdminSettings>
  update: (viewer: ServiceContext, input: UpdateSettings, correlation_id: string) => Promise<AdminSettings>
  ensureDefaults: (correlation_id: string) => Promise<SettingsRow>
}

function assertAppearances(appearances: ReactionAppearances, media_url: string): void {
  for (const appearance of appearances) {
    const field = `reaction_appearances.${appearance.kind}`
    if (appearance.presentation === 'emoji') {
      assertSingleEmoji(appearance.emoji, `${field}.emoji`)
      continue
    }
    assertMediaUrl(appearance.image_url, media_url, `${field}.image_url`)
  }
}

export function createSettingsService(repository: SettingsRepository, options: { media_url: string }): SettingsService {
  return {
    async getPublic() {
      const row = await repository.find()
      return row ? toPublic(row) : toPublic(DEFAULT_SETTINGS)
    },

    async getAdmin(viewer) {
      requireSuperadmin(viewer)
      const row = await repository.find()
      return row ? toAdmin(row) : DEFAULT_SETTINGS
    },

    async update(viewer, input, correlation_id) {
      requireSuperadmin(viewer)
      assertMediaUrl(input.logo_url, options.media_url, 'logo_url')
      assertAppearances(input.reaction_appearances, options.media_url)
      for (const icon of input.profile_status_icons) {
        assertMediaUrl(icon.image_url, options.media_url, `profile_status_icons.${icon.id}.image_url`)
      }
      const saved = await repository.save(
        {
          name: input.name,
          logo_url: input.logo_url,
          locale: input.locale,
          about: input.about,
          registration_open: input.registration_open,
          new_members_can_publish: input.new_members_can_publish,
          reaction_appearances: input.reaction_appearances,
          profile_status_icons: input.profile_status_icons,
        },
        correlation_id,
      )
      return toAdmin(saved)
    },

    async ensureDefaults(correlation_id) {
      const existing = await repository.find()
      if (existing) return existing
      return (await repository.insertIfAbsent(BOOTSTRAP_SETTINGS, correlation_id)) ?? (await repository.find()) ?? BOOTSTRAP_SETTINGS
    },
  }
}
