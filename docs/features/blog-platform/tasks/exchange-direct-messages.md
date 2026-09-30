---
id: T28
title: "Exchange Direct messages between two Users"
layer: "app"
deps: ["T8", "T14", "T16"]
blocks: ["T29", "T37", "T39", "T46"]
acs: ["AC-21", "AC-22"]
files_hint: ["apps/messaging"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T28 — Exchange Direct messages between two Users

## Place in the sequence

- **Blocked by:** T8 — Promote the messages schema migration, T14 — Record a User profile and a unique Username, T16 — Block an account and append the staff audit trail · **Blocks:** T29 — Deliver in-product Notifications, T37 — Relay each schema outbox from its own worker, T39 — Push live Article and Direct message updates, T46 — Show conversations and a live thread · **Wave:** after message tables, profiles, and the Block lookup exist.
- **Lane:** own lane.

## Why (user story)

> **As a** User
> **I want** to send a Direct message to one other User
> **So that** we can talk even if they are away, and I can see when they have read it
>
> — `spec.md §4, US-12, verbatim` · full text: [spec.md](../spec.md)

This task stores a Direct message, the unread count, and the read mark.

## Inlined context

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> Confidential for Direct messages. A Guest or another User who asks for someone else's Direct messages is refused.
>
> — `sad.md §6.1, classification, abridged` · full text: [sad.md](../spec.md)

> The service rejects a body with no text. The insert writes `messages.outbox_events`. `read_at` is set when the recipient reads it and does not insert an outbox row.
>
> — `data-model.md §Entities, messages.direct_messages, abridged` · full text: [data-model.md](../data-model.md)

> `messages.direct_message.sent` is consumed by notifications and by the realtime gateway, and only for the two members.
>
> — `events.md §Event, messages.direct_message.sent.v1, abridged` · full text: [events.md](../contracts/events.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `body` | text | NOT NULL | insert |
| `read_at` | timestamptz | nullable | update |
| `conversation_pairs` | PK of the two sorted User ids | one conversation | insert |

— `data-model.md §Entities, messages.direct_messages, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/conversations` and `GET /api/v1/conversations`.
- `GET` and `POST /api/v1/conversations/{conversation_id}/messages` · errors `422 MESSAGE_BODY_REQUIRED`, `404 CONVERSATION_NOT_FOUND`, `403` for a non-member.
- `POST .../read` sets `read_at`.

— `openapi.yaml §paths, createDirectMessage, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-21 — happy path

> **Given** two Users, and the recipient is not currently present
> **When** the sender sends a Direct message
> **Then** the message is kept, the recipient later sees it with an unread count, and after the recipient reads it the sender sees that it was read
>
> — `spec.md §5, AC-21, verbatim` · full text: [spec.md](../spec.md)

### AC-22 — error

> **Given** a User in a conversation with one other User
> **When** the User tries to send a message with no text
> **Then** the system blocks the send and tells the User that the message must contain text
>
> — `spec.md §5, AC-22, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Add `apps/messaging`. Find or create the pair conversation
- [x] Reject an empty body. Reject a blocked sender via the users service
- [x] Insert the message and `messages.direct_message.sent` together. Set `read_at` without an outbox row
- [x] Return the conversation only to its two members

## Edge cases

| Case | Behaviour |
|---|---|
| Empty body | Return `MESSAGE_BODY_REQUIRED` |
| Outsider reads the thread | Return not found or forbidden, with no message text |
| Recipient is away | Keep the message and the unread count |

## Definition of Done

- [x] Vitest covers AC-21 and AC-22
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
