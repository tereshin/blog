---
id: T51
title: "Manage Categories, roles, and Popular weights"
layer: "ui"
deps: ["T48", "T17", "T15", "T27"]
blocks: []
acs: ["AC-33", "AC-34", "AC-35", "AC-50", "AC-51", "AC-52"]
files_hint: ["apps/admin/src/features/catalog", "packages/i18n/messages/catalog"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T51 — Manage Categories, roles, and Popular weights

## Place in the sequence

- **Blocked by:** T48 — Open the admin panel only after a second factor, T17 — Serve Categories and their three translations, T15 — Assign one role and keep the last Administrator, T27 — Serve Fresh, Popular, and My feed · **Blocks:** none · **Wave:** after the admin shell and the catalog commands exist.
- **Lane:** own admin feature folder.

## Why (user story)

> **As an** Administrator
> **I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
> **So that** the public catalog and the staff stay correct
>
> — `spec.md §4, US-18, verbatim` · full text: [spec.md](../spec.md)

This task is the Administrator catalog: three Category names, one role, and the Popular weights.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-20 states: `default`, `loading`, `created`, `translations-required`, `admin-only`, `theme-applied`, `locale-fallback`. SCR-21 adds `saved`, `reason-required`, `last-administrator`, `first-administrator`, `admin-only`. N/A: people directory. SCR-22 adds `saved`, `admin-only`. The seed values stay until a save. Components: AdminShell, Input, Dropdown, Textarea, Button, Skeleton, Toast.
>
> — `screens.md §Screens, SCR-20 SCR-21 SCR-22, abridged` · full text: [screens.md](../screens.md)

> Popular weights use the equal-weight default until the §11 question closes.
>
> — `sad.md §11, Open weights, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `createCategory`, `assignRole`, `getPopularWeights`, `updatePopularWeights`.
- Map `ADMIN_ONLY`, `CATEGORY_TRANSLATIONS_REQUIRED`, `REASON_REQUIRED`, `LAST_ADMINISTRATOR`, `FIRST_ADMINISTRATOR_FORBIDDEN` onto those states.

— `openapi.yaml §paths, assignRole, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-33 — happy path

> **Given** an Administrator in the admin panel
> **When** they create a Category with English, Serbian Latin, and Russian names, assign the Moderator role to a User, and change the Popular feed weights
> **Then** the Category is available for new Articles in all three names, that User can act as a Moderator, and the Popular feed uses the new weights
>
> — `spec.md §5, AC-33, verbatim` · full text: [spec.md](../spec.md)

### AC-34 — authorization

> **Given** a Moderator in the admin panel
> **When** they try to create a Category, assign a role, or change Popular feed weights
> **Then** the system refuses those actions
>
> — `spec.md §5, AC-34, verbatim` · full text: [spec.md](../spec.md)

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

- [ ] Build SCR-20, SCR-21, and SCR-22. The role screen takes a user id. Do not invent a people directory
- [ ] A Moderator sees `admin-only` and no successful create, role change, or weight save
- [ ] Show the seed weights until the Administrator saves. Do not invent a different starting score

## Edge cases

| Case | Behaviour |
|---|---|
| Missing translation | `translations-required` |
| Role change with no reason | `reason-required` |
| Last Administrator | `last-administrator` |
| First Administrator from the panel | `first-administrator` |

## Definition of Done

- [ ] Component tests cover SCR-20 `translations-required` and `admin-only`, SCR-21 `last-administrator`, and SCR-22 `admin-only`
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
