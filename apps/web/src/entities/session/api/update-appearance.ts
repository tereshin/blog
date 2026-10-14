import { z } from 'zod'
import { http } from '@/shared/api'

const appearanceSchema = z.object({ appearance: z.enum(['light', 'dark']).nullable() })

export type StoredAppearance = z.infer<typeof appearanceSchema>['appearance']

/** `null` — следовать устройству. */
export function updateAppearance(appearance: StoredAppearance): Promise<z.infer<typeof appearanceSchema>> {
  return http.patch('/v1/users/me/appearance', appearanceSchema, { body: { appearance } })
}
