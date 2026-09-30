---
id: T40
title: "Share HeroUI tokens, Theme, and Interface language"
layer: "ui"
deps: []
blocks: ["T41", "T42", "T43", "T44", "T45", "T46", "T47", "T48"]
acs: ["AC-04", "AC-55"]
files_hint: ["packages/ui", "packages/i18n", "apps/web/src/app"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T40 — Share HeroUI tokens, Theme, and Interface language

## Place in the sequence

- **Blocked by:** none · **Blocks:** T41 — Render the Fresh feed, the Popular feed, and a Category, T42 — Render a published Article with Comments and live counts, T43 — Sign in and edit a public profile, T44 — Edit and publish a draft on one screen, T45 — Show My feed and private Bookmarks, T46 — Show conversations and a live thread, T47 — Show Notifications and file a Complaint, T48 — Open the admin panel only after a second factor · **Wave:** starts with the migrations; no API is required.
- **Lane:** own lane. Feature tasks must not edit `packages/ui` or `apps/web/src/app`.

## Why (user story)

> **As a** Guest
> **I want** to switch Theme and Interface language
> **So that** the public site matches how I see and which language I read
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task applies Theme and Interface language on the public site, with the same tokens ready for the admin panel.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> Shared primitives: Modal, Dropdown, Button, Input, Textarea, Avatar, Tooltip, Tabs, Popover, Skeleton, Card, Drawer, DropdownMenu, Pagination, Toast. TanStack Query for server state, Zustand for client state. Locales are `en`, `sr-Latn`, and `ru`.
>
> — `architecture-map.md §Frontend, shared primitives, abridged` · full text: [architecture-map.md](../../../architecture-map.md)

> SCR-01 and SCR-15 include `theme-applied` and `locale-fallback`. System is the Theme before any choice. The choice stays in this browser. A missing Interface string is English. `Pagination` is not used.
>
> — `screens.md §Screens, SCR-01 theme, abridged` · full text: [screens.md](../screens.md)

> `PublicShell` and `AdminShell` are new because the shared primitive list has no shell. `docs/design-system.md` is absent, so names come from the architecture map plus this manifest.
>
> — `screens.md §New components, PublicShell, abridged` · full text: [screens.md](../screens.md)

> Theme `light`, `dark`, or `system`. Interface language `en`, `sr-Latn`, or `ru`. No server column.
>
> — `data-model.md §Outside PostgreSQL, Browser, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

Internal — no API surface. The choice is stored in the browser.


## Acceptance criteria

### AC-04 — happy path

> **Given** a Guest on the public site
> **When** the Guest chooses a Theme among light, dark, and system, and an Interface language among English, Serbian Latin, and Russian
> **Then** the public site uses that Theme and that Interface language, the choice remains on a later visit, and a missing translation falls back to English
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-55 — happy path

> **Given** a Moderator or an Administrator in the admin panel
> **When** they choose a Theme among light, dark, and system, and an Interface language among English, Serbian Latin, and Russian
> **Then** the admin panel uses that Theme and that Interface language, and a missing translation falls back to English
>
> — `spec.md §5, AC-55, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `packages/ui` with the HeroUI v3 theme and semantic tokens only
- [ ] Add `packages/i18n` catalogs for `en`, `sr-Latn`, and `ru`, English fallback, loaded by feature folder so later tasks do not edit this index
- [ ] Add `PublicShell` in `apps/web` with Theme and Interface-language controls. Default Theme is system
- [ ] Persist the choice in this browser and apply it before paint so a dark choice does not flash light

## Edge cases

| Case | Behaviour |
|---|---|
| Missing Serbian or Russian string | Show the English string |
| No choice yet | Theme is system |
| Hard-coded palette color | Do not add one |

## Definition of Done

- [ ] Component tests cover AC-04 on the public shell: the three Themes, the three Interface languages, persistence, and English fallback
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
