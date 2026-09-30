---
id: T32
title: "List open Complaints and dismiss one"
layer: "ports"
deps: ["T13", "T16", "T23", "T24"]
blocks: ["T49"]
acs: ["AC-48", "AC-49"]
files_hint: ["apps/api-gateway/src/complaints", "apps/api-gateway/src/app.module.ts"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T32 — List open Complaints and dismiss one

## Place in the sequence

- **Blocked by:** T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T16 — Block an account and append the staff audit trail, T23 — Record a Complaint about an Article, T24 — Record a Complaint about a Comment · **Blocks:** T49 — Review Complaints and the staff Article · **Wave:** after both complaint stores and the audit client exist.
- **Lane:** shares `apps/api-gateway/src/app.module.ts` with T33, T34, T35, and T36 — serialized.

## Why (user story)

> **As an** Administrator
> **I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
> **So that** the public catalog and the staff stay correct
>
> — `spec.md §4, US-18, verbatim` · full text: [spec.md](../spec.md)

This task shows one open list and dismisses a Complaint without hiding the piece.

## Inlined context

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. One composition keeps the uncached clock on the gateway. The site does not learn every service's route.
>
> — `0003-compose-public-article-read-in-gateway.md §Decision outcome, compose at the gateway, abridged` · full text: [0003-compose-public-article-read-in-gateway.md](../adr/0003-compose-public-article-read-in-gateway.md)

> Dismissal leaves the Article or Comment visible, removes the Complaint from the open list, and appends the audit row with a reason.
>
> — `sad.md §6, Dismiss a complaint, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes. Dismissal is a command to the content or comments service, which updates its own complaint row.

— `data-model.md §Entities, article_complaints, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `GET /api/v1/admin/complaints` merges open Article and Comment Complaints.
- `POST /api/v1/admin/complaints/{complaint_id}/dismiss` · errors `422 REASON_REQUIRED`, `404 COMPLAINT_NOT_FOUND`.

— `openapi.yaml §paths, dismissComplaint, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-48 — happy path

> **Given** an open Complaint about a published Article or a Comment
> **When** a Moderator or an Administrator dismisses it and gives a reason
> **Then** the Article or Comment stays visible to readers, the Complaint leaves the open list, and the action is on the audit trail with that reason
>
> — `spec.md §5, AC-48, verbatim` · full text: [spec.md](../spec.md)

### AC-49 — error

> **Given** an open Complaint
> **When** a Moderator or an Administrator tries to dismiss it with no reason
> **Then** the system blocks the dismissal, tells them that a reason must be present, and the Complaint stays open
>
> — `spec.md §5, AC-49, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add the gateway complaints module. Read open complaints from content and from comments over HTTP
- [ ] Dismiss with a required reason. Leave the target visible
- [ ] Append `complaint.dismiss` through the users service

## Edge cases

| Case | Behaviour |
|---|---|
| Dismiss with no reason | Return `REASON_REQUIRED` and keep the Complaint open |
| Hide already closed it | It is absent from the open list |

## Definition of Done

- [ ] Vitest covers AC-48 and AC-49
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
