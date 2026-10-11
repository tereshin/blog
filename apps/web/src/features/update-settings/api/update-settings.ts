import { adminSettingsSchema, updateSettingsSchema } from '@blog/contracts'
import type { AdminSettings } from '@blog/contracts'
import { http } from '@/shared/api'

export { adminSettingsSchema }
export type { AdminSettings }
export function getAdminSettings(signal?: AbortSignal): Promise<AdminSettings> {
  return http.get('/v1/settings/admin', adminSettingsSchema, { signal })
}
export function updateSettings(body: AdminSettings): Promise<AdminSettings> {
  const input = { ...body }
  delete input.public_origin
  return http.put('/v1/settings', adminSettingsSchema, { body: updateSettingsSchema.parse(input) })
}
