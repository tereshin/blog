import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
export const PageDeletedV1 = defineEvent('content.page.deleted', 1, {
  page_id: z.uuid(),
  slug: z.string(),
  status: z.literal('deleted'),
  page_version: z.number().int().positive(),
  actor_id: z.uuid(),
  updated_at: z.iso.datetime(),
})
