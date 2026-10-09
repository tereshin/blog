import { z } from 'zod'
import { reactionAppearancesSchema } from '../../http/settings.ts'
import { defineEvent } from '../envelope.ts'

/** Суперадминистратор сохранил настройки площадки. Identity копирует флаги регистрации. */
export const SettingsUpdatedV1 = defineEvent('content.settings.updated', 1, {
  // Название площадки не может называться `name`: так уже называется имя события в конверте.
  site_name: z.string().max(100),
  logo_url: z.string().nullable(),
  locale: z.enum(['ru', 'en', 'sr']),
  registration_open: z.boolean(),
  new_members_can_publish: z.boolean(),
  /** Необязательно: старый потребитель флагов регистрации не отвергает конверт v1. */
  reaction_appearances: reactionAppearancesSchema.optional(),
})

export type SettingsUpdatedV1 = z.infer<typeof SettingsUpdatedV1>
