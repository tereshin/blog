---
id: T37
title: "Relay each schema outbox from its own worker"
layer: "infra"
deps: ["T13", "T19", "T22", "T25", "T26", "T28", "T30", "T31"]
blocks: ["T39"]
acs: []
files_hint: ["apps/content/src/outbox-worker", "apps/comments/src/outbox-worker", "apps/engagement/src/outbox-worker", "apps/social/src/outbox-worker", "apps/messaging/src/outbox-worker"]
owner: "Backend Lead"
estimate: "M"
context_budget: "L"   # justified: five relays share one loop and must not cross schemas
status: "done"
---

# T37 — Relay each schema outbox from its own worker

## Place in the sequence

- **Blocked by:** T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T19 — Publish an Article and let the author withdraw it, T22 — Comment, reply, and mention on a visible Article, T25 — Like an Article, Bookmark it, and count one View, T26 — Follow and unfollow Users and Categories, T28 — Exchange Direct messages between two Users, T30 — Hide an Article, move its Category, and staff-remove it, T31 — Hide a Comment and close its Complaints · **Blocks:** T39 — Push live Article and Direct message updates · **Wave:** after the services that insert outbox rows.
- **Lane:** each worker reads only its own schema; the five processes ship together because they share the relay loop in `packages/rabbitmq`.

## Why (user story)

> **As a** User
> **I want** the Like count, the Comment count, new or hidden Comments, a hide, and incoming Direct messages to change while I am looking
> **So that** I do not reload to see what just happened
>
> — `spec.md §4, US-14, verbatim` · full text: [spec.md](../spec.md)

This task publishes committed outbox rows without putting the broker on the write clock.

## Inlined context

> Chosen: Option 1. The 300 ms write does not include the broker round trip. The worker reads only its own schema.
>
> — `0011-relay-outbox-from-worker-process.md §Decision outcome, worker per schema, abridged` · full text: [0011-relay-outbox-from-worker-process.md](../adr/0011-relay-outbox-from-worker-process.md)

> Alert when the oldest unpublished outbox row is older than 500 ms.
>
> — `sad.md §11, outbox lag, abridged` · full text: [sad.md](../sad.md)

> The worker reads the oldest unpublished row. It sets `published_at`. A consumer treats `id` as the idempotency key.
>
> — `data-model.md §Entities, outbox_events, abridged` · full text: [data-model.md](../data-model.md)

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `published_at` | timestamptz | NULL until publish | update |

— `data-model.md §Entities, outbox_events, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.


## Acceptance criteria

This task asserts no spec §5 id. Later tasks assert the criteria that read this slice.

## Checklist

- [x] Run one relay process per emitting schema: content, comments, engagement, social, messaging
- [x] Publish the envelope from the outbox columns and set `published_at` after the broker confirms
- [x] Retry with backoff, then dead-letter. Alert when the oldest unpublished row is older than 500 ms
- [x] Do not let one worker select another schema

## Edge cases

| Case | Behaviour |
|---|---|
| Broker down | Leave `published_at` NULL and retry. The User already has the write result |
| Worker queries two schemas | Do not. That breaks ownership |

## Definition of Done

- [x] Vitest covers a relay that publishes one schema's oldest row and does not select another schema
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
