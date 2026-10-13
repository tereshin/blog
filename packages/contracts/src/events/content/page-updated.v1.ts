import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
export const PageUpdatedV1 = defineEvent('content.page.updated', 1, {
  page_id: z.uuid(),
  slug: z.string(),
  status: z.enum(['draft', 'published']),
  page_version: z.number().int().positive(),
  actor_id: z.uuid(),
  updated_at: z.iso.datetime(),
})
