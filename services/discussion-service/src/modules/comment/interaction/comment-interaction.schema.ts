import { z } from 'zod'
import { pageQuerySchema, reactionKindSchema } from '@blog/contracts'

export const CommentInteractionParamsSchema = z.object({ id: z.uuid() })
export const MentionQuerySchema = z.object({ q: z.string().trim().min(1).max(100) })
export const ReactorsQuerySchema = pageQuerySchema.extend({ kind: reactionKindSchema })

export const InteractionCursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid(), scope: z.string() })
export type InteractionCursor = z.infer<typeof InteractionCursorSchema>
