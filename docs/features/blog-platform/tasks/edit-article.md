---
id: T44
title: "Edit and publish a draft on one screen"
layer: "ui"
deps: ["T40", "T18", "T19", "T20", "T21"]
blocks: []
acs: ["AC-07", "AC-08", "AC-09", "AC-10", "AC-11", "AC-12", "AC-44", "AC-45"]
files_hint: ["apps/web/src/features/editor", "packages/i18n/messages/editor"]
owner: "Frontend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T44 — Edit and publish a draft on one screen

## Place in the sequence

- **Blocked by:** T40 — Share HeroUI tokens, Theme, and Interface language, T18 — Save Article drafts with a version check and sanitized HTML, T19 — Publish an Article and let the author withdraw it, T20 — Keep the previous Article version on a published save, T21 — Issue presigned image uploads · **Blocks:** none · **Wave:** after draft save, publish, revisions, and presign exist.
- **Lane:** own feature folder.

## Why (user story)

> **As a** User
> **I want** to draft an Article, keep the draft as I type, see those edits in a second preview, attach an image, and publish it into one Category
> **So that** readers and followers can see the finished piece
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task keeps the draft, shows the second preview, and surfaces the publish errors on the editor.

## Inlined context

> HeroUI v3 and Tailwind CSS v4 through `packages/ui` when that package exists. Feature components use semantic theme tokens for light, dark, and system themes. No hard-coded palette colors in feature components.
>
> — `sad.md §2, Constraints, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. The 300 ms clock starts when the keystroke is kept in the draft the preview already shares. There is no second preview route.
>
> — `0005-render-draft-preview-on-editor-screen.md §Decision outcome, preview on the editor, abridged` · full text: [0005-render-draft-preview-on-editor-screen.md](../adr/0005-render-draft-preview-on-editor-screen.md)

> SCR-08 states: `default`, `loading`, `category-required`, `title-required`, `text-required`, `language-required`, `block-rejected`, `version-conflict`, `account-blocked`, `image-missing`, `error`, `not-found`, `theme-applied`, `locale-fallback`. N/A: empty, success, preview as its own screen, no-image as its own layout, username-required stays on this screen, guest or other owner, earlier versions. Components: PublicShell, ArticleEditor, ArticleBody, Input, Dropdown, Button, ImageFileInput, Skeleton, EmptyState, Toast.
>
> — `screens.md §Screens, SCR-08, abridged` · full text: [screens.md](../screens.md)

> `ArticleEditor` is new because a Textarea cannot reject an embed or raw HTML block. `ImageFileInput` is new because an image is a file uploaded through a presigned URL.
>
> — `screens.md §New components, ArticleEditor, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `POST /api/v1/articles`, `PATCH /api/v1/me/articles/{article_id}` with `version`, `POST .../publish`, `POST .../images`, `POST /api/v1/media/uploads`.
- Map `ARTICLE_CATEGORY_REQUIRED`, `ARTICLE_TITLE_REQUIRED`, `ARTICLE_TEXT_REQUIRED`, `ARTICLE_LANGUAGE_REQUIRED`, `USERNAME_REQUIRED`, `ARTICLE_BLOCK_REJECTED`, `ARTICLE_VERSION_CONFLICT`, `ACCOUNT_BLOCKED`, `ARTICLE_NOT_OWNED` onto the SCR-08 states. Show `params.serverVersion` on conflict.

— `openapi.yaml §paths, publishMyArticle, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-07 — happy path

> **Given** a User who already has a Username, an open draft, a second preview of that draft, and one Category
> **When** the User types, attaches an image, sets the Content language, and publishes
> **Then** the draft is kept while they type, the second preview shows the same edits, and the published Article shows that text, that image, that Category, and that Content language to a Guest
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** a User's draft with a title and either no Category or more than one Category
> **When** the User tries to publish
> **Then** the system blocks publication and tells the User that an Article must belong to exactly one Category
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — error

> **Given** a User's draft with exactly one Category and no title
> **When** the User tries to publish
> **Then** the system blocks publication and tells the User that the title must be present
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — domain invariant

> **Given** a signed-in person who has not chosen a Username
> **When** they try to publish an Article
> **Then** the system blocks publication and tells them that a Username is required first
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — happy path

> **Given** a User who owns a published Article
> **When** the User changes the text and saves
> **Then** readers see the new text, the previous version remains recorded, and neither readers nor the author browse earlier versions in this release
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — authorization

> **Given** a published Article owned by one User
> **When** a different User tries to change it
> **Then** the system refuses the change
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-44 — error

> **Given** a User's draft with a title and exactly one Category and with no text
> **When** the User tries to publish
> **Then** the system blocks publication and tells the User that the text must be present
>
> — `spec.md §5, AC-44, verbatim` · full text: [spec.md](../spec.md)

### AC-45 — authorization

> **Given** a User's draft
> **When** a Guest or a different User tries to open it
> **Then** they see that it is unavailable, they do not see the text, and they are not told that it is a draft. The author can still open the draft
>
> — `spec.md §5, AC-45, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Build SCR-08 as one screen. The second preview renders the same draft the editor holds
- [ ] Autosave with the current `version`. On conflict show `version-conflict` and do not overwrite
- [ ] Upload bytes to the presigned URL, then call the attach route
- [ ] Publish from this screen. A missing image stays `default`, not its own layout
- [ ] Another User sees `not-found` / unavailable, not the draft text

## Edge cases

| Case | Behaviour |
|---|---|
| Embed block | `block-rejected` |
| No Category | `category-required` |
| No Username | Stay on SCR-08 with `USERNAME_REQUIRED` |
| Two tabs | `version-conflict` |

## Definition of Done

- [ ] Component tests cover SCR-08 `default`, `category-required`, `title-required`, `text-required`, `block-rejected`, and `version-conflict`
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
