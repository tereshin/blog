import { mediaUrl } from './options.ts'
import type { SeedOptions } from './options.ts'
import type { SeedSettings } from './types.ts'

export function buildSettings(options: SeedOptions): SeedSettings {
  return {
    name: 'Тестовый блог',
    logo_url: mediaUrl(options, 'seed/logo.png'),
    locale: 'ru',
    about: 'Площадка публикаций и обсуждений. Это тестовые данные: людей и материалов здесь не существует.',
    registration_open: true,
    new_members_can_publish: true,
  }
}
