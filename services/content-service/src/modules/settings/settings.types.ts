import type {
  BadgeDefinition,
  FaviconSettings,
  ProfileStatusIcon,
  ReactionAppearances,
  SeoSettings,
  ShellVisibility,
  SocialCoverSettings,
} from '@blog/contracts'
import type { BadgeService } from '../badge/index.ts'

export type SettingsRow = {
  welcome_content?: import('@blog/contracts').WelcomeContent | null
  name: string
  logo_url: string | null
  logo_dark_url?: string | null
  favicon?: FaviconSettings
  locale: 'ru' | 'en' | 'sr'
  registration_open: boolean
  new_members_can_publish: boolean
  reaction_appearances: ReactionAppearances
  profile_badges?: import('@blog/contracts').BadgeDefinition[]
  profile_status_icons: ProfileStatusIcon[]
  seo?: SeoSettings
  social_cover?: SocialCoverSettings
  shell?: ShellVisibility
}

export type SettingsRepository = {
  badgeDefinitions: (is_exclusive?: boolean) => Promise<BadgeDefinition[] | null>
  find: () => Promise<SettingsRow | null>
  save: (input: SettingsRow, correlation_id: string) => Promise<SettingsRow>
  /** Вставляет строку `id = 1`, если её нет, и публикует событие. Повтор ничего не пишет. */
  insertIfAbsent: (input: SettingsRow, correlation_id: string) => Promise<SettingsRow | null>
}

export type SettingsTransaction = (
  operation: (repository: SettingsRepository, badges: BadgeService) => Promise<SettingsRow>,
) => Promise<SettingsRow>
