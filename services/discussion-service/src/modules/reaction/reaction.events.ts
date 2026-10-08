import { ArticleCountersUpdatedV1, ReactionAddedV1, ReputationUpdatedV1 } from '@blog/contracts'
import type { ReactionKind } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import type { ArticleCounterSnapshot } from '../article-snapshot/index.ts'

type Envelope = { correlation_id: string; occurred_at: string }

function base(name: string, version: 1, correlation_id: string, occurred_at: string) {
  return { event_id: newEventId(), name, occurred_at, correlation_id, causation_id: null, version }
}

export async function appendReactionEvents(
  tx: Database,
  input: Envelope & {
    snapshot: ArticleCounterSnapshot
    placed: boolean
    target_type: 'article' | 'comment'
    target_id: string
    article_id: string
    actor_id: string
    target_author_id: string
    kind: ReactionKind
    reputation: number
  },
): Promise<void> {
  const { correlation_id, occurred_at } = input
  await appendToOutbox(
    tx,
    ArticleCountersUpdatedV1.parse({
      ...base('discussion.article_counters.updated', 1, correlation_id, occurred_at),
      ...input.snapshot,
    }),
  )
  if (input.placed) {
    await appendToOutbox(
      tx,
      ReactionAddedV1.parse({
        ...base('discussion.reaction.added', 1, correlation_id, occurred_at),
        target_type: input.target_type,
        target_id: input.target_id,
        article_id: input.article_id,
        actor_id: input.actor_id,
        target_author_id: input.target_author_id,
        kind: input.kind,
      }),
    )
  }
  await appendToOutbox(
    tx,
    ReputationUpdatedV1.parse({
      ...base('discussion.reputation.updated', 1, correlation_id, occurred_at),
      user_id: input.target_author_id,
      reputation: input.reputation,
    }),
  )
}
