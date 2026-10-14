import { badgeDefinitionsSchema } from '@blog/contracts'
import {
  welcomeContentSchema,
  DEFAULT_SHELL_VISIBILITY,
  faviconSettingsSchema,
  profileStatusIconsSchema,
  reactionAppearancesSchema,
  shellVisibilitySchema,
} from '@blog/contracts'
import type {
  FaviconSettings,
  ProfileStatusIcon,
  ReactionAppearances,
  ShellVisibility,
} from '@blog/contracts'
import { z } from 'zod'
import { http } from '@/shared/api'

/** Ответ `GET /v1/settings`. Неизвестный язык не ломает приложение: берём русский. */
export const publicSettingsSchema = z.object({
  welcome_content: welcomeContentSchema.nullable().optional(),
  name: z.string(),
  logo_url: z.string().nullable(),
  logo_dark_url: z.string().nullable().optional(),
  favicon: faviconSettingsSchema.optional(),
  locale: z.enum(['ru', 'en', 'sr']).catch('ru'),
  reaction_appearances: reactionAppearancesSchema,
  profile_status_icons: profileStatusIconsSchema.default([]),
  profile_badges: badgeDefinitionsSchema.optional(),
  shell: shellVisibilitySchema.default(DEFAULT_SHELL_VISIBILITY),
})
type PublicSettingsDto = z.infer<typeof publicSettingsSchema>

/** Модель для интерфейса: поля всегда заданы, компоненты не знают о формате ответа. */
export type PublicSettings = {
  welcome_content?: import('@blog/contracts').WelcomeContent | null
  name: string
  logo_url: string | null
  logo_dark_url?: string | null
  favicon?: FaviconSettings
  locale: 'ru' | 'en' | 'sr'
  reaction_appearances: ReactionAppearances
  profile_status_icons: ProfileStatusIcon[]
  profile_badges: import('@blog/contracts').BadgeDefinition[] | null
  shell: ShellVisibility
}

export function toPublicSettings(dto: PublicSettingsDto): PublicSettings {
  return {
    welcome_content: dto.welcome_content ?? null,
    name: dto.name.trim(),
    logo_url: dto.logo_url,
    logo_dark_url: dto.logo_dark_url ?? null,
    favicon: faviconSettingsSchema.parse(dto.favicon ?? {}),
    locale: dto.locale,
    reaction_appearances: dto.reaction_appearances,
    profile_status_icons: dto.profile_status_icons,
    profile_badges: dto.profile_badges ?? null,
    shell: dto.shell,
  }
}

export async function getSettings(signal?: AbortSignal): Promise<PublicSettings> {
  return toPublicSettings(await http.get('/v1/settings', publicSettingsSchema, { signal }))
}
