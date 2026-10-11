import { z } from 'zod'
import { socialCoverInputSchema, socialCoverVariantSchema } from '@blog/contracts'

export const renderTaskSchema = z.object({ input: socialCoverInputSchema, variant: socialCoverVariantSchema, background: z.instanceof(Uint8Array).optional(), logo: z.instanceof(Uint8Array).optional() })
export type RenderTask = z.infer<typeof renderTaskSchema>
export type RenderResult = { bytes: Uint8Array; warnings: string[] }
export type CoverRenderer = { render: (task: RenderTask) => Promise<RenderResult>; close: () => Promise<void> }
export const renderMessageSchema = z.discriminatedUnion('ok', [
  z.object({ id: z.number(), ok: z.literal(true), bytes: z.instanceof(Uint8Array), warnings: z.array(z.string()) }),
  z.object({ id: z.number(), ok: z.literal(false), error: z.string() }),
])
