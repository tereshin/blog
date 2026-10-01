---
id: T31
title: "Hide a Comment and close its Complaints"
layer: "app"
deps: ["T16", "T22", "T24"]
blocks: ["T37", "T39", "T49"]
acs: ["AC-27", "AC-29"]
files_hint: ["apps/comments"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T31 — Hide a Comment and close its Complaints

## Place in the sequence

- **Blocked by:** T16 — Block an account and append the staff audit trail, T22 — Comment, reply, and mention on a visible Article, T24 — Record a Complaint about a Comment · **Blocks:** T37 — Relay each schema outbox from its own worker, T39 — Push live Article and Direct message updates, T49 — Review Complaints and the staff Article · **Wave:** after Comments, Comment complaints, and the audit client exist.
- **Lane:** shares `apps/comments` with T22 and T24 — serialized.

## Why (user story)

> **As a** Moderator
> **I want** to hide an Article or a Comment from a Complaint, and to change an Article's Category, giving a reason
> **So that** readers stop seeing the harmful piece, including people who already have it open
>
> — `spec.md §4, US-16, verbatim` · full text: [spec.md](../spec.md)

This task hides a Comment, closes its open Complaints, and emits the live event.

## Inlined context

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> `comments.comment.hidden` is pushed on the open Article channel. The public Comment becomes unavailable without a staff label.
>
> — `events.md §Event, comments.comment.hidden.v1, abridged` · full text: [events.md](../contracts/events.md)

> A hide inserts `comments.outbox_events` in the same transaction. `status` becomes `hidden`.
>
> — `data-model.md §Entities, comments.comments, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `comments.status` | text | `hidden` | update |
| open Comment complaints | closed on hide |  | update |

— `data-model.md §Entities, comments.comments, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/admin/comments/{comment_id}/hide` · `422 REASON_REQUIRED`, `404 COMMENT_NOT_FOUND`.
- `GET /api/v1/admin/comments/{comment_id}` returns the full text to staff.

— `openapi.yaml §paths, hideComment, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-27 — happy path

> **Given** a Moderator, a Complaint, and a published Article or Comment that readers currently have open
> **When** the Moderator hides that Article or Comment and gives a reason
> **Then** a Guest or a User who is not the author no longer sees the text or the Comments in feeds or on the page, and sees that the piece is unavailable without being told that staff hid it. The author still sees the text and sees that readers cannot. Staff see the full text only in the admin panel. The action is on the audit trail with that reason. Each open Complaint about that Article or Comment leaves the open list
>
> — `spec.md §5, AC-27, verbatim` · full text: [spec.md](../spec.md)

### AC-29 — domain invariant

> **Given** a Moderator hiding an Article or a Comment, or Blocking a User
> **When** they try to complete the action with no reason
> **Then** the system blocks the action and tells them that a reason must be present
>
> — `spec.md §5, AC-29, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Hide only with a reason. Close open Complaints about that Comment
- [x] Insert `comments.comment.hidden` in the same transaction
- [x] Append `comment.hide` through the users service, with retry

## Edge cases

| Case | Behaviour |
|---|---|
| No reason | Return `REASON_REQUIRED` and leave the Comment visible |
| Reader who is not the author | The Comment is unavailable, with no staff label |

## Definition of Done

- [x] Vitest covers the Comment half of AC-27 and AC-29
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
