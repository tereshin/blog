import { z } from 'zod'
export const feedbackDeliverySchema = z.strictObject({
  recipient: z.email(),
  reply_to: z.email().nullable(),
  text: z.string(),
  upload_token: z.string(),
  attachment_ids: z.array(z.uuid()),
})
export const feedbackFilesSchema = z.array(
  z.strictObject({ id: z.uuid(), name: z.string(), mime: z.string(), content: z.string() }),
)
export const feedbackCapabilitySchema = z.strictObject({
  token: z.string().min(32).max(128),
  submission_id: z.uuid(),
  attachment_ids: z.array(z.uuid()).max(5).default([]),
})
