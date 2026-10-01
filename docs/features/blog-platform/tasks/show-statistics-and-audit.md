---
id: T52
title: "Show platform statistics and the audit trail"
layer: "ui"
deps: ["T48", "T35", "T16"]
blocks: []
acs: ["AC-36", "AC-37", "AC-53", "AC-54"]
files_hint: ["apps/admin/src/features/oversight", "packages/i18n/messages/oversight"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T52 — Show platform statistics and the audit trail

## Place in the sequence

- **Blocked by:** T48 — Open the admin panel only after a second factor, T35 — Report platform statistics to an Administrator, T16 — Block an account and append the staff audit trail · **Blocks:** none · **Wave:** after the admin shell, statistics, and the audit read exist.
- **Lane:** own admin feature folder.

## Why (user story)

> **As an** Administrator
> **I want** every hide, Block, role change, staff soft-remove, and Complaint dismissal recorded with a reason, every Category change recorded, and I want to read the whole trail
> **So that** staff actions can be reviewed later
>
> — `spec.md §4, US-19, verbatim` · full text: [spec.md](../spec.md)

This task shows the six figures to an Administrator and the audit rows each staff member is allowed to see.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-23 states: `default`, `loading`, `no-figures`, `theme-applied`, `locale-fallback`. A zero is still `default`. SCR-24 states: `default`, `own`, `loading`, `empty`, `theme-applied`, `locale-fallback`. N/A: rewrite or erase. Components: AdminShell, Card, StaffTable, Button, Skeleton, EmptyState. No edit and no delete on the trail.
>
> — `screens.md §Screens, SCR-23 SCR-24, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `getPlatformStatistics` and `listAuditTrail`.
- A Moderator statistics response is `no-figures`. Their audit response is `own`.

— `openapi.yaml §paths, listAuditTrail, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

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

- [x] Build SCR-23 with the seven figures, including the public-site answering flag
- [x] Build SCR-24 with cursor pages and no edit or delete control
- [x] A Moderator never receives the platform figures

## Edge cases

| Case | Behaviour |
|---|---|
| Moderator statistics | `no-figures` |
| Moderator audit | `own` |
| No rows | `empty` |
| Zero count | Still `default`, the zero is shown |

## Definition of Done

- [x] Component tests cover SCR-23 `default` and `no-figures`, and SCR-24 `default`, `own`, and `empty`
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
