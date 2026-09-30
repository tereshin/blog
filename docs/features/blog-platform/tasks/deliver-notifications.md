---
id: T29
title: "Deliver in-product Notifications"
layer: "app"
deps: ["T9", "T13", "T22", "T26", "T28"]
blocks: ["T47"]
acs: ["AC-26"]
files_hint: ["apps/notification"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T29 — Deliver in-product Notifications

## Place in the sequence

- **Blocked by:** T9 — Promote the notifications schema migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T22 — Comment, reply, and mention on a visible Article, T26 — Follow and unfollow Users and Categories, T28 — Exchange Direct messages between two Users · **Blocks:** T47 — Show Notifications and file a Complaint · **Wave:** after the producers emit follow, comment, and message events.
- **Lane:** own lane.

## Why (user story)

> **As a** User
> **I want** an in-product Notification for a reply, a mention, a new follower, or a new Direct message
> **So that** I hear about activity that involves me
>
> — `spec.md §4, US-15, verbatim` · full text: [spec.md](../spec.md)

This task writes one in-product notice for a reply, a mention, a new follower, or a new Direct message.

## Inlined context

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> Email and phone alerts stay out. Notifications are in-product only.
>
> — `sad.md §11, Accepted debt, abridged` · full text: [sad.md](../sad.md)

> `type` is `reply`, `mention`, `follow`, or `direct_message`. UNIQUE (`user_id`, `source_event_id`). A second delivery inserts nothing. The text is not stored. The client localizes `type`.
>
> — `data-model.md §Entities, notifications.notifications, abridged` · full text: [data-model.md](../data-model.md)

> Consumers are idempotent. This service consumes `comments.comment.created`, `social.user.followed`, and `messages.direct_message.sent`.
>
> — `events.md §Channel, consumers, abridged` · full text: [events.md](../contracts/events.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `type` | text | NOT NULL | insert |
| `source_event_id` | uuid | UNIQUE with `user_id` | insert |

— `data-model.md §Entities, notifications.notifications, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `GET /api/v1/notifications` → `200` cursor page for the caller.
- No email and no phone payload.

— `openapi.yaml §paths, listNotifications, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-26 — happy path

> **Given** a User who can receive notices
> **When** someone replies to their Comment, mentions them, follows them, or sends them a Direct message
> **Then** the User gets an in-product Notification for that event and does not get an email or a phone alert from this release
>
> — `spec.md §5, AC-26, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `apps/notification`. Consume the three events and insert one row per recipient
- [ ] Ignore a duplicate `source_event_id` for that User
- [ ] Do not send email or a phone alert

## Edge cases

| Case | Behaviour |
|---|---|
| Redelivered event | Insert nothing the second time |
| Mention and reply are the same Comment | Write the types the event names, without an email |

## Definition of Done

- [ ] Vitest covers AC-26, including a duplicate event that does not insert a second row
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
