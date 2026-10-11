import { useMutation } from '@tanstack/react-query'
import type { SocialCoverInput } from '@blog/contracts'
import { previewCover } from '../api/preview-cover.ts'

export function useCoverPreview(input: SocialCoverInput) {
  const fingerprint = JSON.stringify(input)
  const mutation = useMutation({ mutationFn: async ({ input: current }: { input: SocialCoverInput; fingerprint: string }) => Promise.all((['og', 'twitter', 'vk'] as const).map(async (variant) => ({ variant, url: await previewCover(current, variant) }))) })
  const is_current = mutation.variables?.fingerprint === fingerprint
  return { generate: () => mutation.mutate({ input, fingerprint }), images: is_current ? mutation.data : undefined, is_pending: is_current && mutation.isPending, is_error: is_current && mutation.isError }
}
