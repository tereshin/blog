import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
export const FeedbackAcceptedV1 = defineEvent('content.feedback.accepted', 1, {
  submission_id: z.uuid(),
  delivery_token: z.string().min(32).max(128),
})
