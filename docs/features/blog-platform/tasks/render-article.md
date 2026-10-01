---
id: T42
title: "Render a published Article with Comments and live counts"
layer: "ui"
deps: ["T40", "T33", "T39", "T22", "T25"]
blocks: []
acs: ["AC-01", "AC-15", "AC-17", "AC-18", "AC-25", "AC-43"]
files_hint: ["apps/web/src/features/article", "packages/i18n/messages/article"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T42 — Render a published Article with Comments and live counts

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T33 — Compose the public Article read and refuse a Guest write, T39 — Push live Article and Direct message updates, T22 — Comment, reply, and mention on a visible Article, T25 — Like an Article, Bookmark it, and count one View · **Blocks:** none · **Wave:** after the composed read and the realtime gateway exist.
- **Lane:** own feature folder.

## Why (user story)

> **As a** Guest
> **I want** to read a published Article with its Comments and counts
> **So that** I can follow a piece without signing in
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task renders the Article, the thread, the Like control, and the live updates on that open view.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> SCR-03 states: `default`, `loading`, `unavailable`, `author`, `not-found`, `liked`, `like-removed`, `comment-blocked`, `comment-invalid`, `flat-reply`, `live`, `edit-refused`, `account-blocked`, `error`, `theme-applied`, `locale-fallback`. N/A: empty, a separate guest sign-in layout, a view-recorded layout, earlier versions, staff full text. Components: PublicShell, ArticleBody, CommentThread, Button, Textarea, Dropdown, Skeleton, EmptyState, Toast.
>
> — `screens.md §Screens, SCR-03, abridged` · full text: [screens.md](../screens.md)

> `ArticleBody` is new because article HTML is its own renderer, not a stack of Cards. `CommentThread` is new because replies nest through depth 3 and a deeper reply is shown flat.
>
> — `screens.md §New components, ArticleBody, abridged` · full text: [screens.md](../screens.md)

> The View count does not have to change on the open view.
>
> — `0006-leave-view-counts-off-live-channel.md §Decision outcome, views, abridged` · full text: [0006-leave-view-counts-off-live-channel.md](../adr/0006-leave-view-counts-off-live-channel.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- Reads `getArticleBySlug`. Writes `toggleArticleLike`, `createArticleComment`, `createCommentReply`, `toggleCommentLike`, `recordArticleView` after 3 seconds visible.
- Subscribes to the Article room from T39.

— `openapi.yaml §paths, getArticleBySlug, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 — happy path

> **Given** a published Article with Comments and counts
> **When** a Guest opens it
> **Then** the Guest sees the Article text, its images, its Comments, and the Like, Comment, and View counts
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — happy path

> **Given** a User viewing a published Article
> **When** the User Likes it and then Likes it again
> **Then** the first action records one Like and raises the count by one, and the second action removes that Like and lowers the count by one
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

### AC-17 — happy path

> **Given** a published Article and two Users
> **When** the first User Comments, the second User replies and mentions the first, and one of them Likes the Comment
> **Then** the reply is kept under that Comment, a reply deeper than the third level is still kept and shown flat, and the mention is available to the mentioned User
>
> — `spec.md §5, AC-17, verbatim` · full text: [spec.md](../spec.md)

### AC-18 — cross-context

> **Given** an Article that is still a draft, that a Moderator has hidden, or that has been soft-removed
> **When** a User tries to Comment on it
> **Then** the system blocks the Comment and tells the User that Comments are only allowed on a published Article that readers can still see
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

### AC-25 — happy path

> **Given** a Guest or a User is looking at a published Article, and a User is in a Direct message conversation
> **When** someone Likes the Article, Comments on it, a Moderator or an Administrator hides that Article or that Comment, or a Direct message arrives
> **Then** the Like count, the Comment count, and the new, hidden, or unavailable Article or Comment change on the open view without a reload for that Guest and that User, the Direct message changes without a reload only for the Users in that conversation, and the View count does not have to change on that open view
>
> — `spec.md §5, AC-25, verbatim` · full text: [spec.md](../spec.md)

### AC-43 — domain invariant

> **Given** a User's draft with a title, exactly one Category, a Content language, and text, and with no image
> **When** the User publishes
> **Then** the system publishes the Article, and a Guest sees the text with no image
>
> — `spec.md §5, AC-43, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Server-render `default` from the composed payload, including a published Article with no image
- [x] Show `unavailable` without the words draft, hidden, or withdrawn. Show `author` with the text and the state
- [x] Nest replies through depth 3 and show a deeper reply flat
- [x] Apply socket events onto the TanStack Query cache for `live`. Do not move the View count on that event
- [x] Send the View after 3 seconds visible

## Edge cases

| Case | Behaviour |
|---|---|
| Comment on an unavailable Article | `comment-blocked` |
| Empty Comment | `comment-invalid` |
| Socket Like | Update the count without reload |
| View event | Ignore it. There is none |

## Definition of Done

- [x] Component tests cover SCR-03 `default`, `unavailable`, `author`, `live`, `comment-blocked`, and `flat-reply`
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
