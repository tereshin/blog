import { z } from 'zod'
import { reactionKindSchema } from '../../http/feed.ts'
import { defineEvent } from '../envelope.ts'

/** Реакция поставлена или заменена. Снятие реакцию не порождает. */
export const ReactionAddedV1 = defineEvent('discussion.reaction.added', 1, {
  target_type: z.enum(['article', 'comment']),
  target_id: z.uuid(),
  article_id: z.uuid(),
  actor_id: z.uuid(),
  target_author_id: z.uuid(),
  kind: reactionKindSchema,
})

export type ReactionAddedV1 = z.infer<typeof ReactionAddedV1>
