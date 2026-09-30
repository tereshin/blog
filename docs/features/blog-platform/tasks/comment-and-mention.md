---
id: T22
title: "Comment, reply, and mention on a visible Article"
layer: "app"
deps: ["T5", "T13", "T19"]
blocks: ["T24", "T29", "T31", "T33", "T35", "T37", "T42"]
acs: ["AC-17", "AC-18"]
files_hint: ["apps/comments"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T22 — Comment, reply, and mention on a visible Article

## Place in the sequence

- **Blocked by:** T5 — Promote the comments schema migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T19 — Publish an Article and let the author withdraw it · **Blocks:** T24 — Record a Complaint about a Comment, T29 — Deliver in-product Notifications, T31 — Hide a Comment and close its Complaints, T33 — Compose the public Article read and refuse a Guest write, T35 — Report platform statistics to an Administrator, T37 — Relay each schema outbox from its own worker, T42 — Render a published Article with Comments and live counts · **Wave:** after comments tables and publish exist.
- **Lane:** shares `apps/comments` with T24 and T31 — serialized.

## Why (user story)

> **As a** User
> **I want** to Comment, reply, Like a Comment, and mention another User
> **So that** the discussion stays on the Article
>
> — `spec.md §4, US-10, verbatim` · full text: [spec.md](../spec.md)

This task stores a Comment, a reply, and a mention, and blocks a Comment on an Article readers cannot see.

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

> Stored as a tree with parent and depth. Replies past the third level are shown flat.
>
> — `sad.md §8, Comments, abridged` · full text: [sad.md](../sad.md)

> The service allows a Comment only when that Article is published. `depth` 1 is on the Article. A reply deeper than 3 keeps the real depth. A create inserts `comments.outbox_events` in the same transaction.
>
> — `data-model.md §Entities, comments.comments, abridged` · full text: [data-model.md](../data-model.md)

> `comments.comment.created` carries the Comment, the parent, the mentioned User ids, and the Article id for the notice and the live channel.
>
> — `events.md §Event, comments.comment.created.v1, abridged` · full text: [events.md](../contracts/events.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `parent_id` | uuid | nullable | insert |
| `depth` | integer | NOT NULL | insert |
| `body` | text | NOT NULL | insert |
| `comment_mentions` | pair | PK (`comment_id`, `mentioned_user_id`) | insert |

— `data-model.md §Entities, comments.comments, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/articles/{article_id}/comments` and `POST /api/v1/comments/{comment_id}/replies` → `201`.
- Errors: `422 COMMENT_ARTICLE_NOT_VISIBLE`, `422 COMMENT_BODY_REQUIRED`, `404 COMMENT_NOT_FOUND`.
- `GET /api/v1/articles/{article_id}/comments` returns the tree. Depth greater than 3 is marked flat.

— `openapi.yaml §paths, createArticleComment, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-17 — happy path

> **Given** a published Article and two Users
> **When** the first User Comments, the second User replies and mentions the first, and one of them Likes the Comment
> **Then** the reply is kept under that Comment, a reply deeper than the third level is still kept and shown flat, and the mention is available to the mentioned User
>
> — `spec.md §5, AC-17, verbatim` · full text: [spec.md](../spec.md)

### AC-18 — cross-context

> **Given** an Article that is still a draft, that a Moderator has hidden, or that has been soft-removed
> **When** a User tries to Comment on it
> **Then** the system blocks the Comment and tells the User that Comments are only allowed on a published Article that readers can still see
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Add `apps/comments`. Ask the content service whether the Article is published and visible. Do not join schema `content`
- [x] Store the reply under the parent. Keep depth above 3 and flag it flat
- [x] Store mentions and insert `comments.comment.created` in the same transaction
- [x] Refuse an empty body

## Edge cases

| Case | Behaviour |
|---|---|
| Draft, hidden, or soft-removed Article | Return `COMMENT_ARTICLE_NOT_VISIBLE` |
| Empty body | Return `COMMENT_BODY_REQUIRED` |
| Reply deeper than 3 | Store it and mark it flat |

## Definition of Done

- [x] Vitest covers AC-17 and AC-18
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
