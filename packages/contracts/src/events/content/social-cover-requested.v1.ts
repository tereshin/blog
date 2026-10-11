import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { socialCoverInputSchema } from '../../http/seo.ts'

export const SocialCoverRequestedV1 = defineEvent('content.social_cover.requested', 1, {
  target_id: z.union([z.literal('site'), z.uuid()]),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  input: socialCoverInputSchema,
})
export type SocialCoverRequestedV1 = z.infer<typeof SocialCoverRequestedV1>
