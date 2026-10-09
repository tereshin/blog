import { ArticleCountersUpdatedV1, ArticleViewCountedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import type { ArticleCounterSnapshot } from '../article-snapshot/index.ts'

function base(name: string, correlation_id: string, occurred_at: string) {
  return { event_id: newEventId(), name, occurred_at, correlation_id, causation_id: null, version: 1 as const }
}

export async function appendViewEvents(
  tx: Database,
  input: { correlation_id: string; occurred_at: string; snapshot: ArticleCounterSnapshot },
): Promise<void> {
  const { correlation_id, occurred_at, snapshot } = input
  await appendToOutbox(
    tx,
    ArticleViewCountedV1.parse({
      ...base('discussion.article_view.counted', correlation_id, occurred_at),
      article_id: snapshot.article_id,
      view_count: snapshot.view_count,
    }),
  )
  await appendToOutbox(tx, ArticleCountersUpdatedV1.parse({ ...base('discussion.article_counters.updated', correlation_id, occurred_at), ...snapshot }))
}
