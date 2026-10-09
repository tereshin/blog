import { ArticleCountersUpdatedV1, CommentCreatedV1, CommentUpdatedV1 } from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import type { ArticleCounterSnapshot } from '../article-snapshot/index.ts'

type Envelope = { correlation_id: string; occurred_at: string }

function base(name: string, correlation_id: string, occurred_at: string) {
  return { event_id: newEventId(), name, occurred_at, correlation_id, causation_id: null, version: 1 as const }
}

export async function appendCommentCreated(
  tx: Database,
  input: Envelope & {
    snapshot: ArticleCounterSnapshot
    comment_id: string
    author_id: string
    parent_id: string | null
    parent_author_id: string | null
    article_author_id: string
    excerpt: string
  },
): Promise<void> {
  const { correlation_id, occurred_at } = input
  await appendToOutbox(
    tx,
    CommentCreatedV1.parse({
      ...base('discussion.comment.created', correlation_id, occurred_at),
      comment_id: input.comment_id,
      article_id: input.snapshot.article_id,
      author_id: input.author_id,
      parent_id: input.parent_id,
      parent_author_id: input.parent_author_id,
      article_author_id: input.article_author_id,
      excerpt: input.excerpt,
    }),
  )
  await appendToOutbox(tx, ArticleCountersUpdatedV1.parse({ ...base('discussion.article_counters.updated', correlation_id, occurred_at), ...input.snapshot }))
}

export async function appendCommentUpdated(
  tx: Database,
  input: Envelope & {
    snapshot: ArticleCounterSnapshot
    comment_id: string
    status: 'visible' | 'deleted' | 'hidden'
    edited_at: string | null
  },
): Promise<void> {
  const { correlation_id, occurred_at } = input
  await appendToOutbox(
    tx,
    CommentUpdatedV1.parse({
      ...base('discussion.comment.updated', correlation_id, occurred_at),
      comment_id: input.comment_id,
      article_id: input.snapshot.article_id,
      status: input.status,
      edited_at: input.edited_at,
    }),
  )
  await appendToOutbox(tx, ArticleCountersUpdatedV1.parse({ ...base('discussion.article_counters.updated', correlation_id, occurred_at), ...input.snapshot }))
}
