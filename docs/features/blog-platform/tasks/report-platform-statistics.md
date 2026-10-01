---
id: T35
title: "Report platform statistics to an Administrator"
layer: "ports"
deps: ["T14", "T19", "T22", "T23", "T24", "T34"]
blocks: ["T52"]
acs: ["AC-53", "AC-54"]
files_hint: ["apps/api-gateway/src/statistics", "apps/api-gateway/src/app.module.ts"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T35 — Report platform statistics to an Administrator

## Place in the sequence

- **Blocked by:** T14 — Record a User profile and a unique Username, T19 — Publish an Article and let the author withdraw it, T22 — Comment, reply, and mention on a visible Article, T23 — Record a Complaint about an Article, T24 — Record a Complaint about a Comment, T34 — Require the staff second factor on admin routes · **Blocks:** T52 — Show platform statistics and the audit trail · **Wave:** after the staff guard and the counted services exist.
- **Lane:** shares `apps/api-gateway/src/app.module.ts` with T32, T33, T34, and T36 — serialized.

## Why (user story)

> **As an** Administrator
> **I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
> **So that** the public catalog and the staff stay correct
>
> — `spec.md §4, US-18, verbatim` · full text: [spec.md](../spec.md)

This task returns the six figures and the public-site health check, and hides them from a Moderator.

## Inlined context

> The figures are distinct Users signed in today, distinct Users signed in over the last 30 days, new Users, Articles published, Comments written, Complaints still open, and whether the public site is answering.
>
> — `spec.md §5, AC-53, abridged` · full text: [spec.md](../spec.md)

> Whether the public site is answering is read from the site's health check, not from a row.
>
> — `data-model.md §Outside PostgreSQL, Health check, abridged` · full text: [data-model.md](../data-model.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes. Each count is an HTTP read of the owning service.


## API contract

- `GET /api/v1/admin/statistics` → `200` for an Administrator · `403 ADMIN_ONLY` for a Moderator.

— `openapi.yaml §paths, getPlatformStatistics, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-53 — happy path

> **Given** an Administrator in the admin panel
> **When** they open platform statistics
> **Then** they see how many distinct Users signed in today, how many distinct Users signed in over the last 30 days, how many Users are new, how many Articles were published, how many Comments were written, how many Complaints are still open, and whether the public site is answering
>
> — `spec.md §5, AC-53, verbatim` · full text: [spec.md](../spec.md)

### AC-54 — authorization

> **Given** a Moderator in the admin panel
> **When** they try to open platform statistics
> **Then** the panel shows them no platform statistics
>
> — `spec.md §5, AC-54, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Aggregate the six counts over HTTP. Read public-site liveness for the answering flag
- [x] Return `ADMIN_ONLY` for a Moderator, with no figures

## Edge cases

| Case | Behaviour |
|---|---|
| Moderator | No figures in the body |
| A count is zero | Return zero. That is still a successful read |

## Definition of Done

- [x] Vitest covers AC-53 and AC-54
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
