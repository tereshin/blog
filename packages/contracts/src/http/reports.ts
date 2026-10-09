import { z } from 'zod'

export const reportStatusSchema = z.enum(['open', 'reviewed'])
export type ReportStatus = z.infer<typeof reportStatusSchema>

export const reportSchema = z.strictObject({
  id: z.uuid(),
  article_id: z.uuid(),
  reporter_id: z.uuid(),
  created_at: z.iso.datetime(),
  status: reportStatusSchema,
})
export type Report = z.infer<typeof reportSchema>
