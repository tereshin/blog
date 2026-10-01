---
id: T48
title: "Open the admin panel only after a second factor"
layer: "ui"
deps: ["T40", "T34"]
blocks: ["T49", "T50", "T51", "T52"]
acs: ["AC-28", "AC-30", "AC-55"]
files_hint: ["apps/admin", "packages/i18n/messages/admin"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T48 — Open the admin panel only after a second factor

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T34 — Require the staff second factor on admin routes · **Blocks:** T49 — Review Complaints and the staff Article, T50 — Block and unblock an account from the admin panel, T51 — Manage Categories, roles, and Popular weights, T52 — Show platform statistics and the audit trail · **Wave:** after tokens and the staff guard exist.
- **Lane:** owns the admin shell. Later admin features must not edit `apps/admin/src/shell`.

## Why (user story)

> **As a** Moderator
> **I want** to hide an Article or a Comment from a Complaint, and to change an Article's Category, giving a reason
> **So that** readers stop seeing the harmful piece, including people who already have it open
>
> — `spec.md §4, US-16, verbatim` · full text: [spec.md](../spec.md)

This task is the admin origin, the second-factor gate, and the admin Theme.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. The admin app stays a Vite SPA because it has no SEO requirement.
>
> — `0001-adopt-nodejs-typescript-monorepo.md §Decision outcome, Vite admin, abridged` · full text: [0001-adopt-nodejs-typescript-monorepo.md](../../../adr/0001-adopt-nodejs-typescript-monorepo.md)

> The admin panel is a Vite SPA on `admin.<domain>`, with no server-rendered HTML. Admin routing is React Router. Admin CORS allows the admin origin only.
>
> — `sad.md §4, UI architecture, abridged` · full text: [sad.md](../sad.md)

> SCR-15 states: `default`, `loading`, `closed`, `refused`, `theme-applied`, `locale-fallback`. Components: AdminShell, Button, Skeleton, Toast. `AdminShell` is new.
>
> — `screens.md §Screens, SCR-15, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- Firebase second factor, then `GET /api/v1/admin/me`.
- `STAFF_FORBIDDEN` is `refused`. `STAFF_MFA_REQUIRED` stays on `default` until the factor is confirmed. Idle 30 minutes returns to the gate.

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

### AC-55 — happy path

> **Given** a Moderator or an Administrator in the admin panel
> **When** they choose a Theme among light, dark, and system, and an Interface language among English, Serbian Latin, and Russian
> **Then** the admin panel uses that Theme and that Interface language, and a missing translation falls back to English
>
> — `spec.md §5, AC-55, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Add `apps/admin` as a Vite SPA. Do not server-render it
- [x] Build `AdminShell` and SCR-15. A refused User is not left inside the panel
- [x] Apply the same three Themes and three Interface languages, stored in this browser, English fallback

## Edge cases

| Case | Behaviour |
|---|---|
| User opens the admin origin | `refused`, not inside |
| Staff skips the second factor | Stay on the gate |
| Missing translation | English |

## Definition of Done

- [x] Component tests cover SCR-15 `default`, `refused`, and `closed`, and AC-55 Theme plus English fallback
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
