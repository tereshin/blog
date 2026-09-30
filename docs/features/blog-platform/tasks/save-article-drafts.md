---
id: T18
title: "Save Article drafts with a version check and sanitized HTML"
layer: "app"
deps: ["T3", "T14", "T17"]
blocks: ["T19", "T20", "T21", "T44"]
acs: ["AC-07", "AC-12", "AC-45"]
files_hint: ["apps/content"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T18 — Save Article drafts with a version check and sanitized HTML

## Place in the sequence

- **Blocked by:** T3 — Promote the content schema migration, T14 — Record a User profile and a unique Username, T17 — Serve Categories and their three translations · **Blocks:** T19 — Publish an Article and let the author withdraw it, T20 — Keep the previous Article version on a published save, T21 — Issue presigned image uploads, T44 — Edit and publish a draft on one screen · **Wave:** after content tables, profiles, and Categories exist.
- **Lane:** shares `apps/content` with T19, T20, T23, and T30 — serialized.

## Why (user story)

> **As a** User
> **I want** to draft an Article, keep the draft as I type, see those edits in a second preview, attach an image, and publish it into one Category
> **So that** readers and followers can see the finished piece
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task keeps the draft while the author types, refuses another User, and hides the draft from everyone else.

## Inlined context

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. An autosave retry and a second tab are both normal. A mismatch does not write.
>
> — `0010-reject-stale-article-save.md §Decision outcome, version check, abridged` · full text: [0010-reject-stale-article-save.md](../adr/0010-reject-stale-article-save.md)

> Chosen: Option 1. Embed blocks and raw HTML blocks are rejected on write. The reader sees text, not a running instruction.
>
> — `0007-reject-embed-and-raw-html-blocks.md §Decision outcome, rejected blocks, abridged` · full text: [0007-reject-embed-and-raw-html-blocks.md](../adr/0007-reject-embed-and-raw-html-blocks.md)

> Editor.js JSON is the editable source. The content service validates and sanitizes on write, stores rendered HTML for SSR, and rejects embed and raw HTML blocks.
>
> — `sad.md §8, Article body, abridged` · full text: [sad.md](../sad.md)

> A draft, a hidden Article, and a soft-removed Article are one public unavailable state. The reader is not told which. The author still sees the text and the state.
>
> — `sad.md §8, Reader-unavailable, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `editor_json` | jsonb | NOT NULL | read-write |
| `rendered_html` | text | NOT NULL | written by the service |
| `version` | integer | NOT NULL | increment on a matching save |
| `status` | text | default `draft` | read |

— `data-model.md §Entities, content.articles, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/articles` → `201` · `GET` and `PATCH /api/v1/me/articles/{article_id}`.
- Errors: `409 ARTICLE_VERSION_CONFLICT` with `params.serverVersion`, `403 ARTICLE_NOT_OWNED`, `422 ARTICLE_BLOCK_REJECTED`, `404 ARTICLE_NOT_FOUND`.
- A Guest or another User reading the draft gets the public unavailable result, not the text, and not the word draft.

— `openapi.yaml §paths, updateMyArticle, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-07 — happy path

> **Given** a User who already has a Username, an open draft, a second preview of that draft, and one Category
> **When** the User types, attaches an image, sets the Content language, and publishes
> **Then** the draft is kept while they type, the second preview shows the same edits, and the published Article shows that text, that image, that Category, and that Content language to a Guest
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — authorization

> **Given** a published Article owned by one User
> **When** a different User tries to change it
> **Then** the system refuses the change
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-45 — authorization

> **Given** a User's draft
> **When** a Guest or a different User tries to open it
> **Then** they see that it is unavailable, they do not see the text, and they are not told that it is a draft. The author can still open the draft
>
> — `spec.md §5, AC-45, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `apps/content`. Create and update a draft owned by the caller
- [ ] Compare `version` and return `ARTICLE_VERSION_CONFLICT` without writing when it mismatches
- [ ] Reject embed and raw HTML blocks with `ARTICLE_BLOCK_REJECTED`. Sanitize the remaining blocks into `rendered_html`
- [ ] Return the author view to the owner and the unavailable view to everyone else

## Edge cases

| Case | Behaviour |
|---|---|
| Stale version | Do not write. Return `ARTICLE_VERSION_CONFLICT` and `params.serverVersion` |
| Embed or raw HTML block | Reject the save |
| Another User opens the draft | Unavailable, no text, no draft label |

## Definition of Done

- [ ] Vitest covers AC-12 and AC-45, and the draft-kept half of AC-07 including a rejected embed block
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
