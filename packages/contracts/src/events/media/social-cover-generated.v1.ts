import { z } from 'zod'
import { defineEvent } from '../envelope.ts'
import { socialImagesSchema } from '../../http/seo.ts'

export const SocialCoverGeneratedV1 = defineEvent('media.social_cover.generated', 1, {
  target_id: z.union([z.literal('site'), z.uuid()]),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  images: socialImagesSchema,
})
export type SocialCoverGeneratedV1 = z.infer<typeof SocialCoverGeneratedV1>
