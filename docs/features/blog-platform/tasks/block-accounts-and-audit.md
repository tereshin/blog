---
id: T16
title: "Block an account and append the staff audit trail"
layer: "app"
deps: ["T15"]
blocks: ["T19", "T28", "T30", "T31", "T32", "T34", "T36", "T50", "T52"]
acs: ["AC-31", "AC-32", "AC-36", "AC-37", "AC-40"]
files_hint: ["apps/users"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T16 — Block an account and append the staff audit trail

## Place in the sequence

- **Blocked by:** T15 — Assign one role and keep the last Administrator · **Blocks:** T19 — Publish an Article and let the author withdraw it, T28 — Exchange Direct messages between two Users, T30 — Hide an Article, move its Category, and staff-remove it, T31 — Hide a Comment and close its Complaints, T32 — List open Complaints and dismiss one, T34 — Require the staff second factor on admin routes, T36 — Count rate limits with a sliding window, T50 — Block and unblock an account from the admin panel, T52 — Show platform statistics and the audit trail · **Wave:** after roles exist, so only staff can Block.
- **Lane:** shares `apps/users` with T14, T15, and T36 — serialized.

## Why (user story)

> **As a** Moderator
> **I want** to Block a User, with a reason, and later lift that Block
> **So that** they cannot keep publishing or messaging
>
> — `spec.md §4, US-17, verbatim` · full text: [spec.md](../spec.md)

This task records a Block, lifts it, and serves the append-only audit read.

## Inlined context

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. One table matches the single audit screen. The Administrator's read is one query in the users service.
>
> — `0002-append-staff-audit-in-users-schema.md §Decision outcome, audit table, abridged` · full text: [0002-append-staff-audit-in-users-schema.md](../adr/0002-append-staff-audit-in-users-schema.md)

> A blocked User cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message. The User can read, edit their own Article, soft-remove their own Article, and file a Complaint. Already published Articles stay visible.
>
> — `sad.md §8, Block, abridged` · full text: [sad.md](../sad.md)

> The hide can commit and the audit append can still fail, because they are two services and two schemas. The gateway retries the audit append. The trail stays append-only either way.
>
> — `sad.md §11, audit split, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `blocks.reason` | text | NOT NULL | insert |
| `blocks.lifted_at` | timestamptz | nullable | update on lift |
| `admin_audit_log` | append-only | trigger rejects UPDATE and DELETE | insert and read |

At most one active Block per User (`lifted_at` NULL). A Block does not change Article rows.

— `data-model.md §Entities, users.blocks, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/admin/users/{user_id}/block` and `POST .../unblock` · errors `422 REASON_REQUIRED`, `404 BLOCK_NOT_FOUND` on a lift with no active Block.
- `GET /api/v1/admin/audit` · an Administrator sees every row. A Moderator sees only rows with their `actor_id`.
- Expose `GET` blocked-state for other services. Do not hide Articles from this service.

— `openapi.yaml §paths, blockUser, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-31 — happy path

> **Given** a Moderator and a User who is not staff
> **When** the Moderator Blocks that User with a reason, and later lifts the Block
> **Then** while blocked the User is told the account is blocked and cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message. The User can still read, edit their own Article, soft-remove their own Article, and file a Complaint. After the lift, publish, Comment, Follow, Like, Bookmark, and Direct messages are possible again
>
> — `spec.md §5, AC-31, verbatim` · full text: [spec.md](../spec.md)

### AC-32 — cross-context

> **Given** a User who already has published Articles
> **When** a Moderator Blocks that User
> **Then** those already published Articles stay visible, and new publishing is refused while the Block lasts
>
> — `spec.md §5, AC-32, verbatim` · full text: [spec.md](../spec.md)

### AC-36 — happy path

> **Given** hide, Block, role-change, and staff soft-remove actions from more than one staff member
> **When** an Administrator opens the audit trail
> **Then** the Administrator sees every hide, Block, role change, staff soft-remove, and Complaint dismissal, each with its reason, and every Category change, and the trail cannot be rewritten or erased by staff
>
> — `spec.md §5, AC-36, verbatim` · full text: [spec.md](../spec.md)

### AC-37 — authorization

> **Given** a Moderator who has performed some staff actions and other staff who have performed others
> **When** the Moderator opens the audit trail
> **Then** the Moderator sees only their own actions
>
> — `spec.md §5, AC-37, verbatim` · full text: [spec.md](../spec.md)

### AC-40 — happy path

> **Given** an Administrator, a Complaint, and a published Article or Comment
> **When** the Administrator hides that Article or Comment, or Blocks the author, and gives a reason
> **Then** readers no longer see the hidden piece, a blocked User cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message, and the action is on the audit trail with that reason
>
> — `spec.md §5, AC-40, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Insert and lift `users.blocks` with a required reason. Append `user.block` and `user.unblock`
- [ ] Serve the audit list from `users.admin_audit_log` with cursor pagination. No update or delete path
- [ ] Return whether a User is blocked so content, comments, engagement, social, and messaging can refuse new writes
- [ ] Do not write schema `content` from this app

## Edge cases

| Case | Behaviour |
|---|---|
| Block with no reason | Return `REASON_REQUIRED` and do not insert |
| Moderator reads the trail | Return only that actor's rows |
| Staff tries to delete an audit row | The append-only trigger rejects it |

## Definition of Done

- [ ] Vitest covers AC-31, AC-36, and AC-37, and asserts a Block writes no Article status change for AC-32 and AC-40
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
