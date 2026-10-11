import { socialCoverPreviewResponseSchema } from '@blog/contracts'
import type { SocialCoverInput, SocialCoverVariant } from '@blog/contracts'
import { http } from '@/shared/api'

export async function previewCover(
  input: SocialCoverInput,
  variant: SocialCoverVariant,
): Promise<string> {
  const result = await http.post(
    '/v1/media/social-cover-preview',
    socialCoverPreviewResponseSchema,
    { body: { input, variant } },
  )
  return result.image_url
}
