import { reactionResponseSchema, sumReactionCounts } from '@blog/contracts'
import type { ReactionKind, ReactionResponse } from '@blog/contracts'
import { EmailUnverifiedError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { canReadArticle } from '../../shared/can-read.ts'
import { requireVerifiedEmail } from '../../shared/require-verified-email.ts'
import { ReactionTargetNotFoundError } from './reaction.errors.ts'
import { applyOne } from './reaction.rules.ts'
import type {
  ArticleCountersPort,
  ReactInput,
  ReactionCatalogPort,
  ReactionEventsPort,
  ReactionKey,
  ReactionRepositoryPort,
  ReactionTarget,
  ReputationPort,
} from './reaction.types.ts'

type CommitReaction = {
  user_id: string
  target: ReactionTarget
  kind: ReactionKind
  idempotency_key: string | null
  correlation_id: string
}

export class ReactionService<TTx> {
  constructor(
    private readonly repository: ReactionRepositoryPort<TTx>,
    private readonly catalog: ReactionCatalogPort<TTx>,
    private readonly counters: ArticleCountersPort<TTx>,
    private readonly reputation: ReputationPort<TTx>,
    private readonly events: ReactionEventsPort<TTx>,
  ) {}

  async react(input: ReactInput): Promise<ReactionResponse> {
    const { viewer, body } = input
    if (viewer.user_id === undefined) throw new UnauthorizedError()
    if (viewer.is_restricted) throw new RestrictedError()
    if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()

    const target = await this.repository.findTarget(body.target_type, body.target_id)
    if (!target || !canReadArticle(viewer, target.access)) throw new ReactionTargetNotFoundError()
    if (target.target_type === 'comment' && target.comment_status !== 'visible') throw new ReactionTargetNotFoundError()

    const commit: CommitReaction = {
      user_id: viewer.user_id,
      target,
      kind: body.kind,
      idempotency_key: input.idempotency_key,
      correlation_id: input.correlation_id,
    }
    return this.repository.transaction((tx) => this.commit(tx, commit))
  }

  private async commit(tx: TTx, input: CommitReaction): Promise<ReactionResponse> {
    if (input.idempotency_key) {
      await this.repository.lock(tx, `idem:${input.user_id}:${input.idempotency_key}`)
      const stored = await this.repository.findStoredResponse(tx, input.user_id, input.idempotency_key)
      if (stored !== null) return reactionResponseSchema.parse(stored)
    }

    const key: ReactionKey = { user_id: input.user_id, target_type: input.target.target_type, target_id: input.target.target_id }
    await this.repository.lock(tx, `react:${key.user_id}:${key.target_type}:${key.target_id}`)
    const current_kind = await this.repository.findKind(tx, key)
    const is_allowed = await this.catalog.isActiveKind(tx, input.kind)
    if (!is_allowed && current_kind !== input.kind) {
      throw new ValidationError({
        message: 'Этого вида реакции нет среди активных',
        details: { field: 'kind' },
      })
    }
    const decision = applyOne(current_kind, input.kind)
    if (decision.next === null) await this.repository.deleteReaction(tx, key)
    else if (current_kind !== null) await this.repository.updateKind(tx, key, decision.next)
    else await this.repository.insertReaction(tx, key, decision.next)

    const reaction_counts = await this.repository.countKinds(tx, key.target_type, key.target_id)
    const reaction_count = sumReactionCounts(reaction_counts)
    if (key.target_type === 'comment') await this.repository.setCommentReactionCount(tx, key.target_id, reaction_count)

    const snapshot = await this.counters.loadCounters(tx, input.target.article_id)
    const reputation = await this.reputation.recompute(tx, input.target.author_id)
    await this.events.appendReactionEvents(tx, {
      correlation_id: input.correlation_id,
      occurred_at: new Date().toISOString(),
      snapshot,
      placed: decision.placed,
      target_type: key.target_type,
      target_id: key.target_id,
      article_id: input.target.article_id,
      actor_id: input.user_id,
      target_author_id: input.target.author_id,
      kind: input.kind,
      reputation,
    })

    const response: ReactionResponse =
      key.target_type === 'article'
        ? { reaction_counts: snapshot.reaction_counts, reaction_count: snapshot.reaction_count, my_reaction: decision.next }
        : { reaction_counts, reaction_count, my_reaction: decision.next }

    if (input.idempotency_key) await this.repository.saveResponse(tx, input.user_id, input.idempotency_key, response)
    return response
  }
}
