import {
  ArticleCountersUpdatedV1,
  CommentCreatedV1,
  CommentHiddenV1,
  CommentUpdatedV1,
} from '@blog/contracts'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import type {
  CommentCreatedInput,
  CommentEventsPort,
  CommentHiddenInput,
  CommentUpdatedInput,
} from './write/comment-write.types.ts'

function base(name: string, correlation_id: string, occurred_at: string) {
  return {
    event_id: newEventId(),
    name,
    occurred_at,
    correlation_id,
    causation_id: null,
    version: 1 as const,
  }
}

export function commentCreatedEvent(input: CommentCreatedInput) {
  const { correlation_id, occurred_at } = input
  return CommentCreatedV1.parse({
    ...base('discussion.comment.created', correlation_id, occurred_at),
    comment_id: input.comment_id,
    article_id: input.snapshot.article_id,
    author_id: input.author_id,
    parent_id: input.parent_id,
    parent_author_id: input.parent_author_id,
    article_author_id: input.article_author_id,
    excerpt: input.excerpt,
    mention_ids: input.mention_ids ?? [],
    subscriber_ids: input.subscriber_ids ?? [],
  })
}

export class CommentEvents implements CommentEventsPort<Database> {
  async appendCreated(tx: Database, input: CommentCreatedInput): Promise<void> {
    const { correlation_id, occurred_at } = input
    await appendToOutbox(tx, commentCreatedEvent(input))
    await appendToOutbox(
      tx,
      ArticleCountersUpdatedV1.parse({
        ...base('discussion.article_counters.updated', correlation_id, occurred_at),
        ...input.snapshot,
      }),
    )
  }

  async appendUpdated(tx: Database, input: CommentUpdatedInput): Promise<void> {
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
    await appendToOutbox(
      tx,
      ArticleCountersUpdatedV1.parse({
        ...base('discussion.article_counters.updated', correlation_id, occurred_at),
        ...input.snapshot,
      }),
    )
  }

  async appendHidden(tx: Database, input: CommentHiddenInput): Promise<void> {
    await appendToOutbox(
      tx,
      CommentHiddenV1.parse({
        ...base('discussion.comment.hidden', input.correlation_id, input.occurred_at),
        comment_id: input.comment_id,
        article_id: input.article_id,
        author_id: input.author_id,
        moderator_id: input.moderator_id,
      }),
    )
  }
}
