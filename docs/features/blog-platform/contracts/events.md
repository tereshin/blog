---
status: Draft
owner: "Backend Lead"
reviewers: []
updated_at: "2026-09-30"
feature_size: XL
---

# Events — blog-platform

Async contract for the flows in `sad.md` §6. A write that emits a fact commits the business row and an outbox row together. A worker of that service publishes the outbox to RabbitMQ. Consumers are idempotent. The HTTP response does not wait for the broker (ADR 0011).

The envelope field names are the ones in `docs/architecture-map.md` and SAD §8: `eventId`, `correlationId`, `causationId`, `timestamp`, `producer`, `eventVersion`. They map from the outbox columns `id`, `correlation_id`, `causation_id`, `created_at`, `producer`, `event_version`. `eventType` is the outbox column `event_type`. This is camelCase because that is the repository envelope, not the snake_case sample in the events template.

`sad.md` §6 says retries use exponential backoff and then a dead letter. It does not state the attempt count or the queue name. Those two numbers stay open. See `api-sync-report.md`.

The view-flush worker is not one of these events. SAD §6 says a failed flush is drawn on `<message-bus>` only as a dead-letter picture, and the same section says that worker does not publish a domain event.

## Channel: domain events

- **Producer:** the service that owns the row (`content`, `comments`, `engagement`, `social`, `messaging`).
- **Consumers:** listed on each event.
- **Delivery:** at-least-once.
- **Ordering:** the sequences do not state an ordering guarantee.

## Envelope

```json
{
  "eventId": "<uuid>",
  "eventType": "<module>.<action>",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "<service>",
  "correlationId": "<uuid or null>",
  "causationId": "<uuid or null>",
  "data": {}
}
```

- **Required fields:** `eventId`, `eventType`, `eventVersion`, `timestamp`, `producer`, `data`.
- **Backwards-compat policy:** additive-only. A new optional field is fine. Removing or renaming a field is a new version. Subscribers ignore unknown fields.

## Event: `content.article.published.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "content.article.published",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "content",
  "correlationId": null,
  "causationId": null,
  "data": {
    "article_id": "<uuid>",
    "author_id": "<uuid>",
    "category_id": "<uuid>",
    "slug": "<string>",
    "language": "en | sr-Latn | ru",
    "published_at": "<iso8601>"
  }
}
```

- **Origin:** Critical flow 1 in `sad.md` §6, message "publishes the outbox event" / "delivers article published". Data-model `content.outbox_events` on publish.
- **Consumers:** feed (drops cached Fresh, Popular, and My feed pages — ADR 0004).
- **Not a consumer:** realtime. A newly published Article shows up when a feed is opened, not as a push onto an open Article (AC-25).

## Event: `content.article.hidden.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "content.article.hidden",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "content",
  "correlationId": null,
  "causationId": null,
  "data": {
    "article_id": "<uuid>",
    "author_id": "<uuid>"
  }
}
```

- **Origin:** Critical flow 2, "publishes the outbox event" / "delivers article hidden". Data-model outbox write on hide.
- **Consumers:** feed (drops cached pages). Realtime (pushes the unavailable state to an open Article).

## Event: `content.article.soft_removed.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "content.article.soft_removed",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "content",
  "correlationId": null,
  "causationId": null,
  "data": {
    "article_id": "<uuid>",
    "author_id": "<uuid>",
    "removed_by": "author | staff"
  }
}
```

- **Origin:** data-model outbox write on author soft-remove and staff soft-remove. ADR 0004 drops feed pages on soft-remove.
- **Consumers:** feed.
- **Not a consumer:** realtime. AC-25's live set is a Like, a Comment, a hide, and a Direct message. Withdrawal is not in that set.

## Event: `content.article.revised.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "content.article.revised",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "content",
  "correlationId": null,
  "causationId": null,
  "data": {
    "article_id": "<uuid>",
    "version": "<integer>"
  }
}
```

- **Origin:** data-model. A text revision updates the Article, inserts `article_revisions` for the previous version, and inserts an outbox row so a cached page can drop.
- **Consumers:** feed.
- **Not a consumer:** realtime. The open Article is not required to replace its text without a reload.

## Event: `comments.comment.created.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "comments.comment.created",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "comments",
  "correlationId": null,
  "causationId": null,
  "data": {
    "comment_id": "<uuid>",
    "article_id": "<uuid>",
    "author_id": "<uuid>",
    "parent_id": "<uuid or null>",
    "mentioned_user_ids": ["<uuid>"]
  }
}
```

- **Origin:** "Watch activity live" and "Receive a notice". Data-model outbox write on a Comment or reply, including a mention.
- **Consumers:** realtime (new Comment on the open Article). Notification (a reply notice to the parent author, a mention notice to each mentioned User). A top-level Comment with no mention has no notice recipient in AC-26.

## Event: `comments.comment.hidden.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "comments.comment.hidden",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "comments",
  "correlationId": null,
  "causationId": null,
  "data": {
    "comment_id": "<uuid>",
    "article_id": "<uuid>",
    "author_id": "<uuid>"
  }
}
```

- **Origin:** "Hide a comment and close its complaints", and "Watch activity live". Data-model outbox write on hide.
- **Consumers:** realtime (the open Article shows the Comment unavailable).

## Event: `engagement.article.liked.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "engagement.article.liked",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "engagement",
  "correlationId": null,
  "causationId": null,
  "data": {
    "article_id": "<uuid>",
    "user_id": "<uuid>",
    "like_count": "<integer>"
  }
}
```

- **Origin:** "Watch activity live". Data-model outbox write on an Article Like.
- **Consumers:** realtime (the open Article shows the new Like count).
- **Not a consumer:** feed. ADR 0004 does not drop a cached page on a Like. Notification does not send a notice for a Like (AC-26).

## Event: `engagement.article.unliked.v1`

Same `data` shape as `engagement.article.liked.v1`, with `eventType` `engagement.article.unliked`.

- **Origin:** data-model outbox write on Unlike. The Like sequence removes the row on the second call.
- **Consumers:** realtime.

## Event: `social.user.followed.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "social.user.followed",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "social",
  "correlationId": null,
  "causationId": null,
  "data": {
    "follower_id": "<uuid>",
    "following_id": "<uuid>"
  }
}
```

- **Origin:** "Receive a notice". Data-model outbox write on a User follow. An unfollow deletes the row and does not emit this event. A Category follow does not emit it.
- **Consumers:** notification (one `follow` notice).
- **Not a consumer:** feed. ADR 0004 drops pages on publish, hide, and soft-remove, not on a Follow. ADR 0001 says the next My feed read is correct. A cached page can stay stale across a Follow until some other drop. That tension is an open question in the sync report.

## Event: `messages.direct_message.sent.v1`

```json
{
  "eventId": "<uuid>",
  "eventType": "messages.direct_message.sent",
  "eventVersion": 1,
  "timestamp": "<iso8601>",
  "producer": "messaging",
  "correlationId": null,
  "causationId": null,
  "data": {
    "message_id": "<uuid>",
    "conversation_id": "<uuid>",
    "sender_id": "<uuid>",
    "recipient_id": "<uuid>"
  }
}
```

- **Origin:** "Watch activity live" and "Receive a notice". Data-model outbox write on a Direct message. The read mark is a column update and does not emit an event.
- **Consumers:** realtime (the two Users in the conversation only). Notification (one `direct_message` notice for the recipient).
- The message body is confidential. It is not in `data`. The client loads the body from `GET /api/v1/conversations/{conversation_id}/messages`.

## Realtime push

The realtime gateway consumes the events above and pushes a UI update. Socket events update the client cache. They are not a second source of truth. A push the process already sent is skipped (SAD §6, Redis socket idempotency). The View count is not pushed (ADR 0006, AC-25).

### Push: open Article

Sent to viewers of that Article.

```json
{
  "kind": "article",
  "article_id": "<uuid>",
  "like_count": "<integer, when the event is a Like or an Unlike>",
  "comment_count": "<integer, when a Comment was created or hidden>",
  "comment": "<CommentRead, when a Comment was created or hidden>",
  "availability": "unavailable, when the Article was hidden"
}
```

- **Origin:** "Watch activity live", branch "a Like count, a Comment count, a new or hidden Comment, or a hide".
- A View increment takes the branch "does not push the View count".

### Push: Direct message

Sent only to the two Users in the conversation. Anyone else sees nothing.

```json
{
  "kind": "direct_message",
  "conversation_id": "<uuid>",
  "message_id": "<uuid>"
}
```

- **Origin:** "Watch activity live", branch "a Direct message".

## Idempotency and retry

- **Idempotency:** a consumer dedupes on `eventId`. A redelivery carries the same id. The notification table also dedupes on `(user_id, source_event_id)`, and `source_event_id` is the outbox id.
- **Retry:** exponential backoff. The attempt count is not in the sequences.
- **Dead-letter:** after retries are exhausted, the event is routed to a dead letter. The sequences do not name the queue.
- **View flush:** the engagement worker folds Redis increments into `engagement.article_stats.view_count`. It retries with exponential backoff and then dead-letters. That dead letter is not an Article event and is not a row in `engagement.outbox_events`.

## Schema registry

- Registry: this file, plus the outbox columns in `data-model.md`. `packages/contracts` does not exist yet. SAD §5 adds it with the first contract implementation.
- Validator: none in the repo yet. Do not assume one.
