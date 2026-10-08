import { z } from 'zod'
import { reactionCountsSchema, reactionKindSchema } from './feed.ts'

export const createReactionSchema = z.strictObject({
  target_type: z.enum(['article', 'comment']),
  target_id: z.uuid(),
  kind: reactionKindSchema,
})
export type CreateReaction = z.infer<typeof createReactionSchema>

/** Итог после постановки, замены или снятия: числа объекта и реакция этого участника. */
export const reactionResponseSchema = z.strictObject({
  reaction_counts: reactionCountsSchema,
  reaction_count: z.number().int().nonnegative(),
  my_reaction: reactionKindSchema.nullable(),
})
export type ReactionResponse = z.infer<typeof reactionResponseSchema>
