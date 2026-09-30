---
id: T34
title: "Require the staff second factor on admin routes"
layer: "ports"
deps: ["T15", "T16", "T33"]
blocks: ["T35", "T48"]
acs: ["AC-28", "AC-30"]
files_hint: ["apps/api-gateway/src/staff", "apps/api-gateway/src/app.module.ts"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T34 — Require the staff second factor on admin routes

## Place in the sequence

- **Blocked by:** T15 — Assign one role and keep the last Administrator, T16 — Block an account and append the staff audit trail, T33 — Compose the public Article read and refuse a Guest write · **Blocks:** T35 — Report platform statistics to an Administrator, T48 — Open the admin panel only after a second factor · **Wave:** after public routing and the role lookup exist.
- **Lane:** shares `apps/api-gateway/src/app.module.ts` with T32, T33, T35, and T36 — serialized.

## Why (user story)

> **As a** Moderator
> **I want** to hide an Article or a Comment from a Complaint, and to change an Article's Category, giving a reason
> **So that** readers stop seeing the harmful piece, including people who already have it open
>
> — `spec.md §4, US-16, verbatim` · full text: [spec.md](../spec.md)

This task keeps a User out of the admin panel and blocks staff tools until the second factor is confirmed.

## Inlined context

> Firebase ID token verified at the gateway. Staff routes also require the second-factor claim. Public sign-in does not open admin routes. Role is read from the users service on every admin request, not from a token claim.
>
> — `sad.md §8, Authentication, abridged` · full text: [sad.md](../sad.md)

> A Moderator or an Administrator signs in again after 30 idle minutes.
>
> — `sad.md §8, Admin session, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `GET /api/v1/admin/me` · errors `403 STAFF_MFA_REQUIRED`, `403 STAFF_FORBIDDEN`.
- Every `/api/v1/admin/` route uses this guard.

— `openapi.yaml §paths, getAdminMe, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-28 — authorization

> **Given** a User who is not a Moderator or an Administrator
> **When** they try to hide an Article or a Comment, or try to open the admin panel
> **Then** the system refuses, and they are not left inside the admin panel
>
> — `spec.md §5, AC-28, verbatim` · full text: [spec.md](../spec.md)

### AC-30 — authorization

> **Given** a Moderator or an Administrator who has not confirmed a second factor
> **When** they try to use staff tools
> **Then** the system does not let them hide, Block, change a Category, assign a role, dismiss a Complaint, or soft-remove
>
> — `spec.md §5, AC-30, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Verify the Firebase token and the second-factor claim on admin routes
- [ ] Read the role from the users service. A User gets `STAFF_FORBIDDEN` and no admin payload
- [ ] A staff token without the second factor gets `STAFF_MFA_REQUIRED`
- [ ] Expire the admin session after 30 idle minutes

## Edge cases

| Case | Behaviour |
|---|---|
| Public sign-in token on an admin route | Return `STAFF_FORBIDDEN` |
| Staff without the second factor | Return `STAFF_MFA_REQUIRED` and do not hide, Block, or assign a role |
| Idle 30 minutes | Require sign-in again |

## Definition of Done

- [ ] Vitest covers AC-28 and AC-30
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
