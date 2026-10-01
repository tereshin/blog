---
id: T36
title: "Count rate limits with a sliding window"
layer: "app"
deps: ["T11", "T13", "T16"]
blocks: ["T33"]
acs: []
files_hint: ["apps/users/src/rate-limits", "apps/api-gateway/src/rate-limit", "apps/api-gateway/src/app.module.ts"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T36 — Count rate limits with a sliding window

## Place in the sequence

- **Blocked by:** T11 — Promote the rate-limit seed migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T16 — Block an account and append the staff audit trail · **Blocks:** T33 — Compose the public Article read and refuse a Guest write · **Wave:** after the seed and the users service exist, and before public reads are exposed.
- **Lane:** shares `apps/users` with T14–T16 and `app.module.ts` with the other gateway tasks — serialized.

## Why (user story)

> **As an** Administrator
> **I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
> **So that** the public catalog and the staff stay correct
>
> — `spec.md §4, US-18, verbatim` · full text: [spec.md](../spec.md)

This task slows repeat actions with the seeded limits and lets an Administrator change the numbers.

## Inlined context

> Chosen: Option 1. The spec's numbers are counts per minute, and a sliding window measures that interval. Changing a limit is a settings write.
>
> — `0009-count-rate-limits-with-sliding-window.md §Decision outcome, sliding window, abridged` · full text: [0009-count-rate-limits-with-sliding-window.md](../adr/0009-count-rate-limits-with-sliding-window.md)

> Redis sliding window at the gateway. Comments 20 per minute, Likes 60 per minute, Follows 30 per minute, Direct messages 60 per minute, Article edits 60 per minute, image attachments 20 per hour. Anonymous reads 60 per minute per visitor. An Administrator can change these limits.
>
> — `sad.md §8, Rate limiting, abridged` · full text: [sad.md](../sad.md)

> Repeat actions are slowed per User. Anonymous reads are slowed per visitor. An Administrator can change these limits.
>
> — `spec.md §6.1, Abuse cases, abridged` · full text: [spec.md](../spec.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `rate_limit_settings.max_count` | integer | NOT NULL | update |
| `window_seconds` | integer | NOT NULL | update |

Counts live in Redis, not in this table.

— `data-model.md §Entities, users.rate_limit_settings, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- Gateway returns `429 RATE_LIMITED` with `params.action`.
- `GET` and `PATCH /api/v1/admin/rate-limits` · errors `403 ADMIN_ONLY`, `404 RATE_LIMIT_NOT_FOUND`.
- There is no screen for these routes. `screens.md` says so.

— `openapi.yaml §paths, updateRateLimit, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

This task asserts no spec §5 id. Later tasks assert the criteria that read this slice.

## Checklist

- [x] Count each seeded action in Redis over a sliding window of `window_seconds`
- [x] Return `RATE_LIMITED` before the command runs
- [x] Let an Administrator change `max_count` and `window_seconds` in `users.rate_limit_settings`

## Edge cases

| Case | Behaviour |
|---|---|
| Anonymous read over 60 in the window | `RATE_LIMITED` with `params.action` `anonymous_read` |
| Moderator changes a limit | Return `ADMIN_ONLY` |
| Clock-minute boundary | The window does not reset on the minute |

## Definition of Done

- [x] Vitest covers a window that blocks the 61st anonymous read and allows the action after the window slides
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
