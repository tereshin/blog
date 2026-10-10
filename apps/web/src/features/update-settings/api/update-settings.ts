import { profileStatusIconsSchema, reactionAppearancesSchema } from '@blog/contracts'
import { z } from 'zod'
import { http } from '@/shared/api'

export const adminSettingsSchema = z.object({
  name: z.string(),
  logo_url: z.string().nullable(),
  locale: z.enum(['ru', 'en', 'sr']),
  about: z.string(),
  registration_open: z.boolean(),
  new_members_can_publish: z.boolean(),
  reaction_appearances: reactionAppearancesSchema,
  profile_status_icons: profileStatusIconsSchema.default([]),
})

export type AdminSettings = z.infer<typeof adminSettingsSchema>

export function getAdminSettings(signal?: AbortSignal): Promise<AdminSettings> {
  return http.get('/v1/settings/admin', adminSettingsSchema, { signal })
}

export function updateSettings(body: AdminSettings): Promise<AdminSettings> {
  return http.put('/v1/settings', adminSettingsSchema, { body })
}
