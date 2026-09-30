---
id: T15
title: "Assign one role and keep the last Administrator"
layer: "app"
deps: ["T14"]
blocks: ["T16", "T17", "T34", "T51"]
acs: ["AC-35", "AC-50", "AC-51", "AC-52"]
files_hint: ["apps/users"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T15 — Assign one role and keep the last Administrator

## Place in the sequence

- **Blocked by:** T14 — Record a User profile and a unique Username · **Blocks:** T16 — Block an account and append the staff audit trail, T17 — Serve Categories and their three translations, T34 — Require the staff second factor on admin routes, T51 — Manage Categories, roles, and Popular weights · **Wave:** after a User row exists.
- **Lane:** shares `apps/users` with T14, T16, and T36 — serialized.

## Why (user story)

> **As an** Administrator
> **I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
> **So that** the public catalog and the staff stay correct
>
> — `spec.md §4, US-18, verbatim` · full text: [spec.md](../spec.md)

This task changes a person's single role, refuses a missing reason, and refuses to remove the last Administrator.

## Inlined context

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. Inside a service, a controller accepts the request and a service holds the business rules. Persistence goes through that service's Drizzle client.
>
> — `0002-own-data-per-nestjs-service.md §Decision outcome, schema per service, abridged` · full text: [0002-own-data-per-nestjs-service.md](../../../adr/0002-own-data-per-nestjs-service.md)

> Operator seed in the users service. The panel cannot create the first one, and it cannot remove the last one.
>
> — `sad.md §8, First Administrator, abridged` · full text: [sad.md](../sad.md)

> The first Administrator is the seed row `id = 018f3c2a-7b10-7c3e-8f21-000000000001`, `firebase_uid = seed-admin`. The panel does not insert this row.
>
> — `data-model.md §Entities, users.users seed, abridged` · full text: [data-model.md](../data-model.md)

> Role is read from the users service on every admin request, not from a token claim.
>
> — `sad.md §8, Authorization, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `role` | text | NOT NULL, one of `user`, `moderator`, `administrator` | read-write |
| `admin_audit_log.reason` | text | nullable in the table, required by the service for `user.role.change` | insert |

— `data-model.md §Entities, users.users, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `PUT /api/v1/admin/users/{user_id}/role` → `200` · errors `403 ADMIN_ONLY`, `403 FIRST_ADMINISTRATOR_FORBIDDEN`, `409 LAST_ADMINISTRATOR`, `422 REASON_REQUIRED`.
- The body sets exactly one role and a reason. The previous role is replaced.

— `openapi.yaml §paths, assignRole, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-35 — domain invariant

> **Given** an Administrator changing a User's role or soft-removing an Article
> **When** they try to complete the action with no reason
> **Then** the system blocks the action and tells them that a reason must be present
>
> — `spec.md §5, AC-35, verbatim` · full text: [spec.md](../spec.md)

### AC-50 — happy path

> **Given** an Administrator, at least one other Administrator, and a User
> **When** the Administrator sets that User to Moderator or to Administrator, or sets a Moderator or another Administrator back to User
> **Then** that person holds exactly one of User, Moderator, or Administrator, and the role they held before is gone
>
> — `spec.md §5, AC-50, verbatim` · full text: [spec.md](../spec.md)

### AC-51 — domain invariant

> **Given** an Administrator who is the only Administrator
> **When** they try to set themselves back to User or to Moderator
> **Then** the system blocks the change and tells them that one Administrator must remain
>
> — `spec.md §5, AC-51, verbatim` · full text: [spec.md](../spec.md)

### AC-52 — domain invariant

> **Given** no Administrator exists yet
> **When** a person tries to grant themselves Administrator from the admin panel
> **Then** the system does not create that first Administrator from the panel
>
> — `spec.md §5, AC-52, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Implement role assignment in `apps/users`. One row holds one role
- [ ] Require a reason. Append `user.role.change` to `users.admin_audit_log` in the same users transaction
- [ ] Block a change that would leave zero Administrators with `LAST_ADMINISTRATOR`
- [ ] Expose no route that inserts the first Administrator. Seed stays an operator step

## Edge cases

| Case | Behaviour |
|---|---|
| Role change with no reason | Return `REASON_REQUIRED` and leave the role |
| Only Administrator demotes themselves | Return `LAST_ADMINISTRATOR` |
| Caller is a Moderator | Return `ADMIN_ONLY` |

## Definition of Done

- [ ] Vitest covers AC-50, AC-51, AC-52, and the reason branch of AC-35
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
