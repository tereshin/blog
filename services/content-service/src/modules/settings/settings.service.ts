import type { PublicSettings } from '@blog/contracts'
import type { SettingsRepository } from './settings.repository.ts'

export const DEFAULT_SETTINGS: PublicSettings = { name: 'Блог', logo_url: null, locale: 'ru', about: '' }

export type SettingsService = { getPublic: () => Promise<PublicSettings> }

export function createSettingsService(repository: SettingsRepository): SettingsService {
  return {
    async getPublic() {
      // Пока суперадминистратор ничего не задал, площадка называется «Блог» и говорит по-русски.
      const row = await repository.findPublic()
      return row ?? DEFAULT_SETTINGS
    },
  }
}
