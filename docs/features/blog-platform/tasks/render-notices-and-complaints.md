---
id: T47
title: "Show Notifications and file a Complaint"
layer: "ui"
deps: ["T40", "T29", "T23", "T24"]
blocks: []
acs: ["AC-23", "AC-24", "AC-26"]
files_hint: ["apps/web/src/features/notices", "packages/i18n/messages/notices"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T47 — Show Notifications and file a Complaint

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T29 — Deliver in-product Notifications, T23 — Record a Complaint about an Article, T24 — Record a Complaint about a Comment · **Blocks:** none · **Wave:** after notices and both complaint commands exist.
- **Lane:** own feature folder.

## Why (user story)

> **As a** User
> **I want** an in-product Notification for a reply, a mention, a new follower, or a new Direct message
> **So that** I hear about activity that involves me
>
> — `spec.md §4, US-15, verbatim` · full text: [spec.md](../spec.md)

This task lists in-product notices and collects a Complaint reason.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-13 states: `default`, `loading`, `empty`, `theme-applied`, `locale-fallback`. N/A: email or phone. The client translates `type`. SCR-14 states: `default`, `loading`, `reason-required`, `not-found`, `theme-applied`, `locale-fallback`. Components: PublicShell, Card, Button, Modal, Textarea, Skeleton, EmptyState, Toast.
>
> — `screens.md §Screens, SCR-13 SCR-14, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `GET /api/v1/notifications`.
- `createArticleComplaint` and `createCommentComplaint`. `COMPLAINT_REASON_REQUIRED` is `reason-required`.

— `openapi.yaml §paths, listNotifications, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-23 — happy path

> **Given** a User and a published Article or a Comment
> **When** the User files a Complaint with a reason
> **Then** a Moderator or an Administrator can see that Complaint in the admin panel
>
> — `spec.md §5, AC-23, verbatim` · full text: [spec.md](../spec.md)

### AC-24 — error

> **Given** a User filing a Complaint
> **When** they submit it with no reason
> **Then** the system blocks the Complaint and tells them that a reason must be present
>
> — `spec.md §5, AC-24, verbatim` · full text: [spec.md](../spec.md)

### AC-26 — happy path

> **Given** a User who can receive notices
> **When** someone replies to their Comment, mentions them, follows them, or sends them a Direct message
> **Then** the User gets an in-product Notification for that event and does not get an email or a phone alert from this release
>
> — `spec.md §5, AC-26, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Build SCR-13. A reply or mention opens the Article. A follower opens the profile. A Direct message opens the conversation
- [ ] Build SCR-14 as a Modal. Require a reason before submit
- [ ] Do not add an email or phone control

## Edge cases

| Case | Behaviour |
|---|---|
| No notices | SCR-13 `empty` |
| Submit with no reason | `reason-required` |
| Target gone | `not-found` |

## Definition of Done

- [ ] Component tests cover SCR-13 `default` and `empty`, and SCR-14 `reason-required`
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
