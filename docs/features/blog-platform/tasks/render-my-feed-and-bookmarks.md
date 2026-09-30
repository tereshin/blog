---
id: T45
title: "Show My feed and private Bookmarks"
layer: "ui"
deps: ["T40", "T27", "T25"]
blocks: []
acs: ["AC-14", "AC-19", "AC-20"]
files_hint: ["apps/web/src/features/library", "packages/i18n/messages/library"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T45 — Show My feed and private Bookmarks

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T27 — Serve Fresh, Popular, and My feed, T25 — Like an Article, Bookmark it, and count one View · **Blocks:** none · **Wave:** after My feed and the Bookmark list exist.
- **Lane:** own feature folder.

## Why (user story)

> **As a** User
> **I want** My feed
> **So that** I see writing from the people and topics I follow
>
> — `spec.md §4, US-08, verbatim` · full text: [spec.md](../spec.md)

This task shows the caller's My feed and their private Bookmark list.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-09 states: `default`, `loading`, `empty`, `content-language-limited`, `error`, `theme-applied`, `locale-fallback`. N/A: guest. SCR-10 states: `default`, `loading`, `empty`, `theme-applied`, `locale-fallback`. N/A: error, and someone else's list. Components: PublicShell, Button, Dropdown, Card, Skeleton, EmptyState, Toast.
>
> — `screens.md §Screens, SCR-09 SCR-10, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `GET /api/v1/feeds/mine` and `GET /api/v1/me/bookmarks`.
- Removing a Bookmark uses `removeBookmark` and drops that card.

— `openapi.yaml §paths, listMyFeed, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-14 — cross-context

> **Given** a User who follows one author and one Category, and published Articles from that author, from that Category, and from neither
> **When** the User opens My feed
> **Then** the feed shows every currently published Article from the followed author and from the followed Category, newest first, each Article once, it does not show the unrelated Articles, and it shows only that User's chosen Content languages when a limit is set
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

### AC-19 — happy path

> **Given** a User and a published Article
> **When** the User Bookmarks it and later removes the Bookmark
> **Then** the Article appears in that User's private Bookmark list and then disappears from that list
>
> — `spec.md §5, AC-19, verbatim` · full text: [spec.md](../spec.md)

### AC-20 — authorization

> **Given** a User has Bookmarked an Article
> **When** a Guest or a different User tries to open that Bookmark list
> **Then** the system does not show it
>
> — `spec.md §5, AC-20, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Build SCR-09 and SCR-10 for the signed-in User only
- [ ] Render each Article once, in the API order
- [ ] Do not add a route that loads another User's Bookmark list

## Edge cases

| Case | Behaviour |
|---|---|
| No followed Articles | SCR-09 `empty` |
| Last Bookmark removed | SCR-10 `empty` |
| Guest | Do not render My feed. SCR-04 is the sign-in path |

## Definition of Done

- [ ] Component tests cover SCR-09 and SCR-10 `default` and `empty`
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
