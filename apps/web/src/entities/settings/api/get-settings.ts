import { badgeDefinitionsSchema } from '@blog/contracts'
import {
  welcomeContentSchema,
  DEFAULT_SHELL_VISIBILITY,
  DEFAULT_THEME_SETTINGS,
  faviconSettingsSchema,
  profileStatusIconsSchema,
  reactionAppearancesSchema,
  shellVisibilitySchema,
  themeSettingsSchema,
} from '@blog/contracts'
import type {
  FaviconSettings,
  ProfileStatusIcon,
  ReactionAppearances,
  ShellVisibility,
  ThemeSettings,
} from '@blog/contracts'
import { z } from 'zod'
import { http } from '@/shared/api'

/** Ответ `GET /v1/settings`. Неизвестный язык не ломает приложение: берём русский. */
export const publicSettingsSchema = z.object({
  meta_pixel_id: z.string().nullable().optional(),
  maintenance_enabled: z.boolean().optional(),
  welcome_content: welcomeContentSchema.nullable().optional(),
  name: z.string(),
  font_family: z.string().optional(),
  font_stylesheet_url: z.url().nullable().optional(),
  logo_url: z.string().nullable(),
  logo_dark_url: z.string().nullable().optional(),
  favicon: faviconSettingsSchema.optional(),
  locale: z.enum(['ru', 'en', 'sr']).catch('ru'),
  reaction_appearances: reactionAppearancesSchema,
  profile_status_icons: profileStatusIconsSchema.default([]),
  profile_badges: badgeDefinitionsSchema,
  shell: shellVisibilitySchema.default(DEFAULT_SHELL_VISIBILITY),
  theme: themeSettingsSchema.default(DEFAULT_THEME_SETTINGS),
})
type PublicSettingsDto = z.infer<typeof publicSettingsSchema>

/** Модель для интерфейса: поля всегда заданы, компоненты не знают о формате ответа. */
export type PublicSettings = {
  meta_pixel_id?: string | null
  maintenance_enabled?: boolean
  welcome_content?: import('@blog/contracts').WelcomeContent | null
  name: string
  font_family?: string
  font_stylesheet_url?: string | null
  logo_url: string | null
  logo_dark_url?: string | null
  favicon?: FaviconSettings
  locale: 'ru' | 'en' | 'sr'
  reaction_appearances: ReactionAppearances
  profile_status_icons: ProfileStatusIcon[]
  profile_badges: import('@blog/contracts').BadgeDefinition[]
  shell: ShellVisibility
  theme: ThemeSettings
}

export function toPublicSettings(dto: PublicSettingsDto): PublicSettings {
  return {
    meta_pixel_id: dto.meta_pixel_id ?? null,
    maintenance_enabled: dto.maintenance_enabled ?? false,
    welcome_content: dto.welcome_content ?? null,
    name: dto.name.trim(),
    font_family: dto.font_family ?? 'Inter',
    font_stylesheet_url: dto.font_stylesheet_url ?? null,
    logo_url: dto.logo_url,
    logo_dark_url: dto.logo_dark_url ?? null,
    favicon: faviconSettingsSchema.parse(dto.favicon ?? {}),
    locale: dto.locale,
    reaction_appearances: dto.reaction_appearances,
    profile_status_icons: dto.profile_status_icons,
    profile_badges: dto.profile_badges,
    shell: dto.shell,
    theme: themeSettingsSchema.parse(dto.theme ?? {}),
  }
}

export async function getSettings(signal?: AbortSignal): Promise<PublicSettings> {
  return toPublicSettings(await http.get('/v1/settings', publicSettingsSchema, { signal }))
}
