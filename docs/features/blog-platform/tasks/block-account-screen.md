---
id: T50
title: "Block and unblock an account from the admin panel"
layer: "ui"
deps: ["T48", "T16"]
blocks: []
acs: ["AC-31"]
files_hint: ["apps/admin/src/features/block", "packages/i18n/messages/block"]
owner: "Frontend Lead"
estimate: "S"
context_budget: "M"
status: "todo"
---

# T50 — Block and unblock an account from the admin panel

## Place in the sequence

- **Blocked by:** T48 — Open the admin panel only after a second factor, T16 — Block an account and append the staff audit trail · **Blocks:** none · **Wave:** after the admin shell and the Block API exist.
- **Lane:** own admin feature folder.

## Why (user story)

> **As a** Moderator
> **I want** to Block a User, with a reason, and later lift that Block
> **So that** they cannot keep publishing or messaging
>
> — `spec.md §4, US-17, verbatim` · full text: [spec.md](../spec.md)

This task collects the Block reason and lifts an active Block.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-19 states: `default`, `loading`, `reason-required`, `blocked`, `lifted`, `not-found`, `theme-applied`, `locale-fallback`. Components: AdminShell, Textarea, Button, Skeleton, EmptyState, Toast.
>
> — `screens.md §Screens, SCR-19, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `blockUser` and `unblockUser`. `REASON_REQUIRED` is `reason-required`. `BLOCK_NOT_FOUND` is `not-found`.

— `openapi.yaml §paths, blockUser, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-31 — happy path

> **Given** a Moderator and a User who is not staff
> **When** the Moderator Blocks that User with a reason, and later lifts the Block
> **Then** while blocked the User is told the account is blocked and cannot publish, Comment, Follow, Like, Bookmark, or send a Direct message. The User can still read, edit their own Article, soft-remove their own Article, and file a Complaint. After the lift, publish, Comment, Follow, Like, Bookmark, and Direct messages are possible again
>
> — `spec.md §5, AC-31, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Build SCR-19 from a Complaint's author
- [ ] Require a reason. Show Lift when a Block is active

## Edge cases

| Case | Behaviour |
|---|---|
| No reason | `reason-required` |
| Lift when no Block | `not-found` |

## Definition of Done

- [ ] Component tests cover SCR-19 `reason-required`, `blocked`, and `lifted`
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
