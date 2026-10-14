import { z } from 'zod'
import { faviconSettingsSchema } from '@blog/contracts'

/** Часть `GET /v1/settings`, нужная для файлов сайта. */
export const SiteSettingsSchema = z.object({ favicon: faviconSettingsSchema.optional() })
