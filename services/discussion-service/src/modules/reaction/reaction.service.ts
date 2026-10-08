import { canReadArticle } from '@blog/contracts'
import type { ReactionResponse } from '@blog/contracts'
import { RestrictedError, UnauthorizedError } from '@blog/errors'
import { ReactionTargetNotFoundError } from './reaction.errors.ts'
import type { ReactInput, ReactionRepository } from './reaction.types.ts'

export type ReactionService = {
  react: (input: ReactInput) => Promise<ReactionResponse>
}

export function createReactionService(repository: ReactionRepository): ReactionService {
  return {
    async react(input) {
      const { viewer, body } = input
      if (viewer.user_id === undefined) throw new UnauthorizedError()
      if (viewer.is_restricted) throw new RestrictedError()

      const target = await repository.findTarget(body.target_type, body.target_id)
      if (!target || !canReadArticle(viewer, target.access)) throw new ReactionTargetNotFoundError()
      if (target.target_type === 'comment' && target.comment_status !== 'visible') throw new ReactionTargetNotFoundError()

      return repository.commit({
        user_id: viewer.user_id,
        target,
        kind: body.kind,
        idempotency_key: input.idempotency_key,
        correlation_id: input.correlation_id,
      })
    },
  }
}
