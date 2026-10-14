import { ArticleCountersUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import type { ArticleCounterSnapshot } from '../article-snapshot/index.ts'
import type { BookmarkEventsPort } from './bookmark.types.ts'

export class BookmarkEvents implements BookmarkEventsPort<Database> {
  async appendCountersUpdated(tx: Database, input: { correlation_id: string; snapshot: ArticleCounterSnapshot }): Promise<void> {
    await appendToOutbox(
      tx,
      ArticleCountersUpdatedV1.parse({
        event_id: newEventId(),
        name: 'discussion.article_counters.updated',
        occurred_at: new Date().toISOString(),
        correlation_id: input.correlation_id,
        causation_id: null,
        version: 1,
        ...input.snapshot,
      }),
    )
  }
}
