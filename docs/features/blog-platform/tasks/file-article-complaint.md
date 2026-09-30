---
id: T23
title: "Record a Complaint about an Article"
layer: "app"
deps: ["T19"]
blocks: ["T30", "T32", "T35", "T47"]
acs: ["AC-23", "AC-24"]
files_hint: ["apps/content"]
owner: "Backend Lead"
estimate: "S"
context_budget: "S"
status: "done"
---

# T23 — Record a Complaint about an Article

## Place in the sequence

- **Blocked by:** T19 — Publish an Article and let the author withdraw it · **Blocks:** T30 — Hide an Article, move its Category, and staff-remove it, T32 — List open Complaints and dismiss one, T35 — Report platform statistics to an Administrator, T47 — Show Notifications and file a Complaint · **Wave:** after an Article can be published.
- **Lane:** shares `apps/content` with T18, T19, T20, and T30 — serialized.

## Why (user story)

> **As a** User
> **I want** to file a Complaint about an Article or a Comment
> **So that** a Moderator can review it
>
> — `spec.md §4, US-13, verbatim` · full text: [spec.md](../spec.md)

This task stores an Article Complaint when a reason is present.

## Inlined context

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> An Article Complaint stays open until a hide of that Article or a dismissal. The reason is required.
>
> — `data-model.md §Entities, article_complaints, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `content.article_complaints.reason` | text | NOT NULL | insert |
| status | open until hide or dismissal |  | insert |

— `data-model.md §Entities, content.article_complaints, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/articles/{article_id}/complaints` → `201` · errors `404 ARTICLE_NOT_FOUND`, `422 COMPLAINT_REASON_REQUIRED`.
- A blocked User may still file.

— `openapi.yaml §paths, createArticleComplaint, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

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

- [x] Insert an open Article Complaint with a required reason
- [x] Refuse a missing reason with `COMPLAINT_REASON_REQUIRED`
- [x] Do not hide the Article from this command

## Edge cases

| Case | Behaviour |
|---|---|
| No reason | Return `COMPLAINT_REASON_REQUIRED` and do not insert |
| Blocked User files | Accept the Complaint |

## Definition of Done

- [x] Vitest covers the Article half of AC-23 and AC-24
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
