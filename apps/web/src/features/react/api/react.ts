import { reactionCountsSchema, reactionKindSchema } from '@blog/contracts'
import type { ReactionKind } from '@blog/contracts'
import { z } from 'zod'
import { http } from '@/shared/api'

const reactionResponseSchema = z.object({
  reaction_counts: reactionCountsSchema,
  reaction_count: z.number(),
  my_reaction: reactionKindSchema.nullable(),
})

export type ReactionResponse = z.infer<typeof reactionResponseSchema>

export function sendReaction(input: {
  target_type: 'article' | 'comment'
  target_id: string
  kind: ReactionKind
}): Promise<ReactionResponse> {
  return http.post('/v1/reactions', reactionResponseSchema, { body: input })
}
