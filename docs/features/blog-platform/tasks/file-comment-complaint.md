---
id: T24
title: "Record a Complaint about a Comment"
layer: "app"
deps: ["T22"]
blocks: ["T31", "T32", "T35", "T47"]
acs: ["AC-23", "AC-24"]
files_hint: ["apps/comments"]
owner: "Backend Lead"
estimate: "S"
context_budget: "S"
status: "done"
---

# T24 — Record a Complaint about a Comment

## Place in the sequence

- **Blocked by:** T22 — Comment, reply, and mention on a visible Article · **Blocks:** T31 — Hide a Comment and close its Complaints, T32 — List open Complaints and dismiss one, T35 — Report platform statistics to an Administrator, T47 — Show Notifications and file a Complaint · **Wave:** after a Comment can be stored.
- **Lane:** shares `apps/comments` with T22 and T31 — serialized.

## Why (user story)

> **As a** User
> **I want** to file a Complaint about an Article or a Comment
> **So that** a Moderator can review it
>
> — `spec.md §4, US-13, verbatim` · full text: [spec.md](../spec.md)

This task stores a Comment Complaint when a reason is present.

## Inlined context

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> A Comment Complaint stays open until a hide of that Comment or a dismissal. The reason is required.
>
> — `data-model.md §Entities, comment_complaints, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `comments.comment_complaints.reason` | text | NOT NULL | insert |

— `data-model.md §Entities, comments.comment_complaints, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/comments/{comment_id}/complaints` → `201` · errors `404 COMMENT_NOT_FOUND`, `422 COMPLAINT_REASON_REQUIRED`.

— `openapi.yaml §paths, createCommentComplaint, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-23 — happy path

> **Given** a User and a published Article or a Comment
> **When** the User files a Complaint with a reason
> **Then** a Moderator or an Administrator can see that Complaint in the admin panel
>
> — `spec.md §5, AC-23, verbatim` · full text: [spec.md](../spec.md)

### AC-24 — error

> **Given** a User filing a Complaint
> **When** they submit it with no reason
> **Then** the system blocks the Complaint and tells them that a reason must be present
>
> — `spec.md §5, AC-24, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Insert an open Comment Complaint with a required reason
- [x] Refuse a missing reason and an unknown Comment

## Edge cases

| Case | Behaviour |
|---|---|
| No reason | Return `COMPLAINT_REASON_REQUIRED` |
| Unknown Comment | Return `COMMENT_NOT_FOUND` |

## Definition of Done

- [x] Vitest covers the Comment half of AC-23 and AC-24
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
