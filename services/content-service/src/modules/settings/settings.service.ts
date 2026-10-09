import type { AdminSettings, PublicSettings, ServiceContext, UpdateSettings } from '@blog/contracts'
import { requireSuperadmin } from '../access/require-superadmin.ts'
import { assertMediaUrl } from '../media-url.ts'
import type { SettingsRepository, SettingsRow } from './settings.repository.ts'

export const DEFAULT_SETTINGS: AdminSettings = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  about: '',
  registration_open: true,
  new_members_can_publish: true,
}

function toPublic(row: SettingsRow): PublicSettings {
  return { name: row.name, logo_url: row.logo_url, locale: row.locale, about: row.about }
}

/** Настройки пустой площадки: регистрация закрыта, публиковать новым участникам можно. */
export const BOOTSTRAP_SETTINGS: SettingsRow = {
  name: 'Блог',
  logo_url: null,
  locale: 'ru',
  about: '',
  registration_open: false,
  new_members_can_publish: true,
}

export type SettingsService = {
  getPublic: () => Promise<PublicSettings>
  getAdmin: (viewer: ServiceContext) => Promise<AdminSettings>
  update: (viewer: ServiceContext, input: UpdateSettings, correlation_id: string) => Promise<AdminSettings>
  ensureDefaults: (correlation_id: string) => Promise<SettingsRow>
}

export function createSettingsService(repository: SettingsRepository, options: { media_url: string }): SettingsService {
  return {
    async getPublic() {
      const row = await repository.find()
      return row ? toPublic(row) : toPublic(DEFAULT_SETTINGS)
    },

    async getAdmin(viewer) {
      requireSuperadmin(viewer)
      return (await repository.find()) ?? DEFAULT_SETTINGS
    },

    async update(viewer, input, correlation_id) {
      requireSuperadmin(viewer)
      assertMediaUrl(input.logo_url, options.media_url, 'logo_url')
      return repository.save(input, correlation_id)
    },

    async ensureDefaults(correlation_id) {
      const existing = await repository.find()
      if (existing) return existing
      return (await repository.insertIfAbsent(BOOTSTRAP_SETTINGS, correlation_id)) ?? (await repository.find()) ?? BOOTSTRAP_SETTINGS
    },
  }
}
