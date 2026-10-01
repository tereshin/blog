---
id: T43
title: "Sign in and edit a public profile"
layer: "ui"
deps: ["T40", "T14", "T33", "T26"]
blocks: []
acs: ["AC-05", "AC-06", "AC-13", "AC-16", "AC-42"]
files_hint: ["apps/web/src/features/profile", "packages/i18n/messages/profile"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T43 — Sign in and edit a public profile

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T14 — Record a User profile and a unique Username, T33 — Compose the public Article read and refuse a Guest write, T26 — Follow and unfollow Users and Categories · **Blocks:** none · **Wave:** after the profile API and the Guest-write response exist.
- **Lane:** own feature folder.

## Why (user story)

> **As a** User
> **I want** a unique Username and a public profile
> **So that** other people can find me and follow me
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task asks a Guest to sign in, then lets them save a Username and a public profile.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-04 states: `default`, `loading`, `error`, `theme-applied`, `locale-fallback`. SCR-05 adds `not-found`, `following`, `not-following`, `account-blocked`. SCR-06 adds `username-taken`, `username-required`. Components: PublicShell, Button, Avatar, Input, Textarea, Dropdown, Skeleton, EmptyState, Toast. Avatar on SCR-06 is text, not the Article upload.
>
> — `screens.md §Screens, SCR-04 SCR-05 SCR-06, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- Firebase sign-in, then `GET /api/v1/me` and `PUT /api/v1/me`.
- `GET /api/v1/users/{username}`. Follow uses `followUser`.
- `AUTH_REQUIRED` opens SCR-04. `USERNAME_TAKEN` is the SCR-06 toast. The client translates `code`.

— `openapi.yaml §paths, updateMe, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-05 — happy path

> **Given** a person who has just signed in and has no Username yet
> **When** they choose a Username that nobody else has and save a public profile
> **Then** the system records that User, and a Guest can open the profile and see the Username
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — error

> **Given** a User is choosing a Username that another User already has
> **When** they try to save it
> **Then** the system blocks the save and tells them that the Username is already taken
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — happy path

> **Given** a User, another User, and a Category
> **When** the first User follows that User and that Category, then stops following one of them
> **Then** the system records the remaining Follow and drops the one they stopped
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — authorization

> **Given** a Guest viewing a published Article
> **When** the Guest tries to Like, Comment, Follow, Bookmark, publish, or send a Direct message
> **Then** the system does not record the action and asks the Guest to sign in
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

### AC-42 — happy path

> **Given** a User who already has a Username
> **When** they save a Display name, a Biography, or an Avatar
> **Then** a Guest who opens the profile sees each field that was saved, and a field that was not saved is absent
>
> — `spec.md §5, AC-42, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Build SCR-04, SCR-05, and SCR-06. Omit a profile field the API omitted
- [x] Show `username-taken` from `USERNAME_TAKEN`
- [x] Follow and unfollow on SCR-05
- [x] Route a Guest write's `AUTH_REQUIRED` to SCR-04

## Edge cases

| Case | Behaviour |
|---|---|
| Taken Username | Block the save in the UI from the error code |
| Unsaved Biography | Do not render an empty Biography |
| Unknown Username | SCR-05 `not-found` |

## Definition of Done

- [x] Component tests cover SCR-04 `default` and `error`, SCR-05 `default` and `not-found`, and SCR-06 `username-taken`
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
