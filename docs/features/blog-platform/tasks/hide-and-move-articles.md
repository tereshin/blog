---
id: T30
title: "Hide an Article, move its Category, and staff-remove it"
layer: "app"
deps: ["T16", "T19", "T23"]
blocks: ["T37", "T39", "T49"]
acs: ["AC-27", "AC-29", "AC-35", "AC-39", "AC-40", "AC-41", "AC-47"]
files_hint: ["apps/content"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T30 — Hide an Article, move its Category, and staff-remove it

## Place in the sequence

- **Blocked by:** T16 — Block an account and append the staff audit trail, T19 — Publish an Article and let the author withdraw it, T23 — Record a Complaint about an Article · **Blocks:** T37 — Relay each schema outbox from its own worker, T39 — Push live Article and Direct message updates, T49 — Review Complaints and the staff Article · **Wave:** after publish, Article complaints, and the audit client exist.
- **Lane:** shares `apps/content` with T18, T19, T20, and T23 — serialized.

## Why (user story)

> **As a** Moderator
> **I want** to hide an Article or a Comment from a Complaint, and to change an Article's Category, giving a reason
> **So that** readers stop seeing the harmful piece, including people who already have it open
>
> — `spec.md §4, US-16, verbatim` · full text: [spec.md](../spec.md)

This task hides an Article, moves its Category, and soft-removes it as staff, each with the audit append.

## Inlined context

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> A hidden Article and a soft-removed Article are one public unavailable state. The reader is not told which. The author still sees the text and the state. Staff see the full text only in the admin panel.
>
> — `sad.md §8, Reader-unavailable, abridged` · full text: [sad.md](../sad.md)

> `content.article.hidden` and `content.article.soft_removed` drop feed pages and are pushed on the live Article channel.
>
> — `events.md §Event, content.article.hidden.v1, abridged` · full text: [events.md](../contracts/events.md)

> Reason is required for hide and staff soft-remove. A Category change may omit it.
>
> — `data-model.md §Entities, admin_audit_log.reason, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `status` | text | `hidden` or `soft_removed` | update |
| `removed_by` | text | `staff` on staff soft-remove | update |
| `category_id` | uuid | one Category | update |
| open Article complaints | closed on hide |  | update |

— `data-model.md §Entities, content.articles, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/admin/articles/{article_id}/hide` · `422 REASON_REQUIRED`.
- `POST /api/v1/admin/articles/{article_id}/category` · no reason required · `404 CATEGORY_NOT_FOUND`.
- `POST /api/v1/admin/articles/{article_id}/soft-remove` · `403 ADMIN_ONLY`, `422 REASON_REQUIRED`.
- `GET /api/v1/admin/articles/{article_id}` returns the full text to staff.

— `openapi.yaml §paths, hideArticle, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

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

### AC-35 — domain invariant

> **Given** an Administrator changing a User's role or soft-removing an Article
> **When** they try to complete the action with no reason
> **Then** the system blocks the action and tells them that a reason must be present
>
> — `spec.md §5, AC-35, verbatim` · full text: [spec.md](../spec.md)

### AC-39 — happy path

> **Given** an Administrator and a published Article
> **When** the Administrator soft-removes it and gives a reason
> **Then** readers no longer see it, the record remains, and the action is on the audit trail with that reason
>
> — `spec.md §5, AC-39, verbatim` · full text: [spec.md](../spec.md)

### AC-40 — happy path

> **Given** an Administrator, a Complaint, and a published Article or Comment
> **When** the Administrator hides that Article or Comment, or Blocks the author, and gives a reason
> **Then** readers no longer see the hidden piece, a blocked User cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message, and the action is on the audit trail with that reason
>
> — `spec.md §5, AC-40, verbatim` · full text: [spec.md](../spec.md)

### AC-41 — authorization

> **Given** a published Article owned by one User
> **When** a different User, or a Moderator, tries to soft-remove it
> **Then** the system refuses, and the Moderator can still hide it with a reason
>
> — `spec.md §5, AC-41, verbatim` · full text: [spec.md](../spec.md)

### AC-47 — happy path

> **Given** a Moderator and a published Article in one Category
> **When** the Moderator moves it to one other Category and gives no reason
> **Then** readers see the Article in the new Category, the action is on the audit trail, and the move stands without a reason
>
> — `spec.md §5, AC-47, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Hide with a reason, set the public view to unavailable, and close open Article Complaints
- [x] Insert `content.article.hidden` or `content.article.soft_removed` in the same transaction
- [x] Ask the users service to append the audit row, and retry if that append fails
- [x] Move Category with no reason and append `article.category.change`
- [x] Staff soft-remove is Administrator-only and sets `removed_by` `staff`. Author withdraw stays `author`

## Edge cases

| Case | Behaviour |
|---|---|
| Hide with no reason | Return `REASON_REQUIRED` |
| Category move with no reason | Commit the move and the audit row |
| Moderator staff-removes | Return `ADMIN_ONLY`. Hide remains allowed |
| Reader who is not the author | Unavailable, no text, no staff-hid label |

## Definition of Done

- [x] Vitest covers AC-27 for an Article, AC-29, AC-39, AC-47, and the staff half of AC-40 and AC-41
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
