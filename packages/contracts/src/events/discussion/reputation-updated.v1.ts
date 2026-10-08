import { z } from 'zod'
import { defineEvent } from '../envelope.ts'

/** Репутация пересчитана из текущих реакций, а не изменена на дельту. */
export const ReputationUpdatedV1 = defineEvent('discussion.reputation.updated', 1, {
  user_id: z.uuid(),
  reputation: z.number().int().nonnegative(),
})

export type ReputationUpdatedV1 = z.infer<typeof ReputationUpdatedV1>
