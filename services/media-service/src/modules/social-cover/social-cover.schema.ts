import { z } from 'zod'
import { socialCoverInputSchema, socialCoverPreviewSchema, socialCoverVariantSchema } from '@blog/contracts'

export const SocialCoverPreviewBodySchema = socialCoverPreviewSchema
export type SocialCoverPreviewBody = z.infer<typeof SocialCoverPreviewBodySchema>

export const RenderTaskSchema = z.object({
  input: socialCoverInputSchema,
  variant: socialCoverVariantSchema,
  background: z.instanceof(Uint8Array).optional(),
  logo: z.instanceof(Uint8Array).optional(),
})
export type RenderTask = z.infer<typeof RenderTaskSchema>

/** Сообщение пула потоку рендера. */
export const RenderRequestSchema = z.object({ id: z.number(), task: RenderTaskSchema })

/** Ответ потока рендера пулу. */
export const RenderMessageSchema = z.discriminatedUnion('ok', [
  z.object({ id: z.number(), ok: z.literal(true), bytes: z.instanceof(Uint8Array), warnings: z.array(z.string()) }),
  z.object({ id: z.number(), ok: z.literal(false), error: z.string() }),
])
