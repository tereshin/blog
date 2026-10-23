import type {
  BadgeDefinition,
  FaviconSettings,
  ProfileStatusIcon,
  ReactionAppearances,
  SeoSettings,
  ShellVisibility,
  SocialCoverSettings,
  WelcomeContent,
} from '@blog/contracts'
import type { FileOwner } from '../../shared/editor-document/document.sanitizer.ts'

export type SettingsRow = {
  meta_pixel_id?: string | null
  welcome_content?: WelcomeContent | null
  name: string
  logo_url: string | null
  logo_dark_url?: string | null
  favicon?: FaviconSettings
  locale: 'ru' | 'en' | 'sr'
  maintenance_enabled?: boolean
  registration_open: boolean
  new_members_can_publish: boolean
  reaction_appearances: ReactionAppearances
  profile_badges?: BadgeDefinition[]
  profile_status_icons: ProfileStatusIcon[]
  seo?: SeoSettings
  social_cover?: SocialCoverSettings
  shell?: ShellVisibility
}

/** Порт хранилища настроек. Запись строки и события идут в одной транзакции `TTx`. */
export type SettingsRepositoryPort<TTx> = {
  transaction: <T>(work: (tx: TTx) => Promise<T>) => Promise<T>
  find: () => Promise<SettingsRow | null>
  findMaintenance: () => Promise<{ maintenance_enabled: boolean; locale: SettingsRow['locale'] } | null>
  save: (tx: TTx, input: SettingsRow) => Promise<SettingsRow>
  /** Вставляет строку `id = 1`, если её нет. `null` — строка уже была, ничего не записано. */
  insertIfAbsent: (tx: TTx, input: SettingsRow) => Promise<SettingsRow | null>
  appendUpdated: (tx: TTx, input: SettingsRow, correlation_id: string) => Promise<void>
}

/** Каталог бейджей блокируется и проверяется в транзакции сохранения настроек. */
export type SettingsBadgesPort<TTx> = {
  validateReplacement: (tx: TTx, next: BadgeDefinition[] | undefined) => Promise<BadgeDefinition[]>
}

export type SettingsCoversPort<TTx> = {
  requestSiteCover: (tx: TTx, correlation_id: string) => Promise<void>
}

export type SettingsOptions = {
  media_url: string
  public_origin?: string
  lookupFile?: (url: string) => Promise<FileOwner | null>
}
