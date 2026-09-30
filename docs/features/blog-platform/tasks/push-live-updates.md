---
id: T39
title: "Push live Article and Direct message updates"
layer: "app"
deps: ["T37", "T28", "T30", "T31"]
blocks: ["T42", "T46"]
acs: ["AC-25"]
files_hint: ["apps/realtime"]
owner: "Backend Lead"
estimate: "M"
context_budget: "S"
status: "todo"
---

# T39 — Push live Article and Direct message updates

## Place in the sequence

- **Blocked by:** T37 — Relay each schema outbox from its own worker, T28 — Exchange Direct messages between two Users, T30 — Hide an Article, move its Category, and staff-remove it, T31 — Hide a Comment and close its Complaints · **Blocks:** T42 — Render a published Article with Comments and live counts, T46 — Show conversations and a live thread · **Wave:** after the outbox relay publishes Like, Comment, hide, and message events.
- **Lane:** own lane.

## Why (user story)

> **As a** User
> **I want** the Like count, the Comment count, new or hidden Comments, a hide, and incoming Direct messages to change while I am looking
> **So that** I do not reload to see what just happened
>
> — `spec.md §4, US-14, verbatim` · full text: [spec.md](../spec.md)

This task pushes the open-Article events and the conversation events, and leaves the View count off that channel.

## Inlined context

> Chosen: Option 1. The 500 ms channel stays for the events the spec puts on the open view. A viral Article does not flood the room with View ticks.
>
> — `0006-leave-view-counts-off-live-channel.md §Decision outcome, no view ticks, abridged` · full text: [0006-leave-view-counts-off-live-channel.md](../adr/0006-leave-view-counts-off-live-channel.md)

> The live path is the queue, then the socket. The write returns when the owning row and the outbox commit. The realtime gateway consumes the event and pushes it to the open Article or the open Direct message conversation.
>
> — `sad.md §4, choice 3, abridged` · full text: [sad.md](../sad.md)

> Latency p95 until that open view changes is ≤ 500 ms, measured from the action being recorded to the open Article view changing. The View count does not have to change on that open view.
>
> — `sad.md §10, QG-2, abridged` · full text: [sad.md](../sad.md)

> A newly published Article is not pushed onto an open Article. It shows up when a feed is opened.
>
> — `events.md §Event, content.article.published.v1, abridged` · full text: [events.md](../contracts/events.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes. Socket idempotency for a push that already went out lives in the process, as `data-model.md` §Outside PostgreSQL states.

— `data-model.md §Outside PostgreSQL, socket idempotency, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no REST surface. Socket rooms: one published Article, and one conversation for its two members only.

— `sad.md §6, Watch activity live, abridged` · full text: [sad.md](../sad.md)

## Acceptance criteria

### AC-25 — happy path

> **Given** a Guest or a User is looking at a published Article, and a User is in a Direct message conversation
> **When** someone Likes the Article, Comments on it, a Moderator or an Administrator hides that Article or that Comment, or a Direct message arrives
> **Then** the Like count, the Comment count, and the new, hidden, or unavailable Article or Comment change on the open view without a reload for that Guest and that User, the Direct message changes without a reload only for the Users in that conversation, and the View count does not have to change on that open view
>
> — `spec.md §5, AC-25, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `apps/realtime`. Verify the socket token with `packages/firebase`
- [ ] Push Like counts, Comment counts, new Comments, hidden Comments, and Article hide or unavailable
- [ ] Push a Direct message only to the two members of that conversation
- [ ] Do not push View increments and do not push `content.article.published`

## Edge cases

| Case | Behaviour |
|---|---|
| View flushed | No socket event |
| User outside the conversation | No message payload |
| Duplicate delivery | Skip a push already sent for that event id |

## Definition of Done

- [ ] Vitest covers AC-25: the Article room gets a Like, a Comment, and a hide, the conversation room gets a message, and a View emits nothing
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
