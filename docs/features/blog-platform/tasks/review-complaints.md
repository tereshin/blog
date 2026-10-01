---
id: T49
title: "Review Complaints and the staff Article"
layer: "ui"
deps: ["T48", "T30", "T31", "T32"]
blocks: []
acs: ["AC-27", "AC-38", "AC-39", "AC-47", "AC-48", "AC-49"]
files_hint: ["apps/admin/src/features/moderation", "packages/i18n/messages/moderation"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T49 — Review Complaints and the staff Article

## Place in the sequence

- **Blocked by:** T48 — Open the admin panel only after a second factor, T30 — Hide an Article, move its Category, and staff-remove it, T31 — Hide a Comment and close its Complaints, T32 — List open Complaints and dismiss one · **Blocks:** none · **Wave:** after the admin shell and the staff Article commands exist.
- **Lane:** own admin feature folder.

## Why (user story)

> **As a** Moderator
> **I want** to hide an Article or a Comment from a Complaint, and to change an Article's Category, giving a reason
> **So that** readers stop seeing the harmful piece, including people who already have it open
>
> — `spec.md §4, US-16, verbatim` · full text: [spec.md](../spec.md)

This task is the open-complaint list, the hide or dismiss step, and the staff Article.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-16 states: `default`, `loading`, `empty`, `theme-applied`, `locale-fallback`. SCR-17 adds `reason-required`, `not-found`. SCR-18 adds `category-moved`, `reason-required`, `removed`, `admin-only`, `not-found`. Components: AdminShell, StaffTable, Button, Dropdown, Textarea, ArticleBody, Skeleton, EmptyState, Toast. `StaffTable` is new because the shared list has no table and Pagination is the wrong page shape.
>
> — `screens.md §Screens, SCR-16 SCR-17 SCR-18, abridged` · full text: [screens.md](../screens.md)

> GET and PATCH `/api/v1/admin/rate-limits` have no screen. Do not add one.
>
> — `screens.md §Source, rate limits, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `listOpenComplaints`, `dismissComplaint`, `hideArticle`, `hideComment`, `moveArticleCategory`, `staffSoftRemoveArticle`, `getAdminArticle`.
- `REASON_REQUIRED` is `reason-required`. A Category move does not ask for a reason. `ADMIN_ONLY` is `admin-only`.

— `openapi.yaml §paths, hideArticle, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-27 — happy path

> **Given** a Moderator, a Complaint, and a published Article or Comment that readers currently have open
> **When** the Moderator hides that Article or Comment and gives a reason
> **Then** a Guest or a User who is not the author no longer sees the text or the Comments in feeds or on the page, and sees that the piece is unavailable without being told that staff hid it. The author still sees the text and sees that readers cannot. Staff see the full text only in the admin panel. The action is on the audit trail with that reason. Each open Complaint about that Article or Comment leaves the open list
>
> — `spec.md §5, AC-27, verbatim` · full text: [spec.md](../spec.md)

### AC-38 — happy path

> **Given** a User who owns a published Article
> **When** the User soft-removes it
> **Then** a Guest or a User who is not the author no longer sees it in the feeds or on its page, sees that it is unavailable, with no text and no Comments, and is not told that the author withdrew it. The author sees the text and sees that they withdrew it. The record remains. The Article is not treated as hidden by a Moderator. Staff see the full text only in the admin panel
>
> — `spec.md §5, AC-38, verbatim` · full text: [spec.md](../spec.md)

### AC-39 — happy path

> **Given** an Administrator and a published Article
> **When** the Administrator soft-removes it and gives a reason
> **Then** readers no longer see it, the record remains, and the action is on the audit trail with that reason
>
> — `spec.md §5, AC-39, verbatim` · full text: [spec.md](../spec.md)

### AC-47 — happy path

> **Given** a Moderator and a published Article in one Category
> **When** the Moderator moves it to one other Category and gives no reason
> **Then** readers see the Article in the new Category, the action is on the audit trail, and the move stands without a reason
>
> — `spec.md §5, AC-47, verbatim` · full text: [spec.md](../spec.md)

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

- [x] Build SCR-16, SCR-17, and SCR-18. Cursor next page is a Button
- [x] Hide and dismiss require a reason. Category move does not
- [x] Show the full Article text only on SCR-18. Author withdraw is not labeled as a staff hide
- [x] Register `StaffTable` under `apps/admin/src/shared`

## Edge cases

| Case | Behaviour |
|---|---|
| Dismiss with no reason | `reason-required`, Complaint stays |
| Hide succeeds | Matching rows leave SCR-16 |
| Moderator soft-remove | `admin-only` |
| Category move | `category-moved` without a reason field |

## Definition of Done

- [x] Component tests cover SCR-16 `empty`, SCR-17 `reason-required`, and SCR-18 `default`, `category-moved`, and `admin-only`
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
