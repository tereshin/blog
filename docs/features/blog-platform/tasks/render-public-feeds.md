---
id: T41
title: "Render the Fresh feed, the Popular feed, and a Category"
layer: "ui"
deps: ["T40", "T27", "T17", "T26"]
blocks: []
acs: ["AC-03", "AC-13", "AC-46"]
files_hint: ["apps/web/src/features/feeds", "packages/i18n/messages/feeds"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T41 — Render the Fresh feed, the Popular feed, and a Category

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T27 — Serve Fresh, Popular, and My feed, T17 — Serve Categories and their three translations, T26 — Follow and unfollow Users and Categories · **Blocks:** none · **Wave:** after the shell, the feed API, and Categories exist.
- **Lane:** own feature folder.

## Why (user story)

> **As a** Guest
> **I want** to open the Fresh feed and the Popular feed
> **So that** I can find new and active writing
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task shows Fresh and Popular to a Guest, and a Category the User can follow.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-01 and SCR-02 states: `default`, `loading`, `empty`, `error`, `content-language-limited`, `theme-applied`, `locale-fallback`. SCR-07 adds `not-found`, `following`, `not-following`, `account-blocked`. N/A: success, validation, and a separate My-feed-hidden layout. Components: PublicShell, Button, Dropdown, Card, Skeleton, EmptyState, Toast. The next page is a Button, not Pagination.
>
> — `screens.md §Screens, SCR-01 SCR-02 SCR-07, abridged` · full text: [screens.md](../screens.md)

> Article and feed HTML are rendered on the server. Socket events update the Query cache. They are not a second source of truth.
>
> — `sad.md §4, UI architecture, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- Reads `listFreshFeed`, `listPopularFeed`, `getCategory`, `followCategory`, `unfollowCategory`.
- Error toast translates `RATE_LIMITED` with `params.action` `anonymous_read`.

— `openapi.yaml §paths, listFreshFeed, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-03 — happy path

> **Given** several published Articles of different ages and engagement
> **When** a Guest opens the Fresh feed and the Popular feed
> **Then** the Fresh feed lists published Articles newest first, the Popular feed lists them by the current score of Views, Likes, Comments, Bookmarks, and age, Articles of every Content language appear, and My feed is not offered
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — happy path

> **Given** a User, another User, and a Category
> **When** the first User follows that User and that Category, then stops following one of them
> **Then** the system records the remaining Follow and drops the one they stopped
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-46 — cross-context

> **Given** a User
> **When** they set a Content language limit to one or more of English, Serbian Latin, and Russian, or they clear that limit
> **Then** the Fresh feed, the Popular feed, and My feed show only the chosen Content languages, and a cleared limit shows every Content language
>
> — `spec.md §5, AC-46, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Server-render SCR-01 and SCR-02 from the feed payload. Page size is whatever the API returned, expected 20
- [x] Do not offer My feed to a Guest. A signed-in User can set the Content-language control that calls T14's route
- [x] Build SCR-07 with Follow and the not-found empty state
- [x] Register `EmptyState` once under `apps/web/src/shared`. It is new because the primitive list has no empty state

## Edge cases

| Case | Behaviour |
|---|---|
| Empty `items` | SCR-01 `empty` / SCR-02 `empty` |
| 429 | Toast, page stays |
| Guest | No My feed link and no Content-language control |

## Definition of Done

- [x] Component tests cover SCR-01, SCR-02, and SCR-07 `default`, `loading`, `empty` or `not-found`, and `error`, and AC-03's Guest chrome
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
