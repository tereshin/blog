---
id: T19
title: "Publish an Article and let the author withdraw it"
layer: "app"
deps: ["T18", "T16"]
blocks: ["T22", "T23", "T25", "T27", "T30", "T33", "T35", "T37", "T44"]
acs: ["AC-08", "AC-09", "AC-10", "AC-32", "AC-38", "AC-41", "AC-43", "AC-44"]
files_hint: ["apps/content"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T19 — Publish an Article and let the author withdraw it

## Place in the sequence

- **Blocked by:** T18 — Save Article drafts with a version check and sanitized HTML, T16 — Block an account and append the staff audit trail · **Blocks:** T22 — Comment, reply, and mention on a visible Article, T23 — Record a Complaint about an Article, T25 — Like an Article, Bookmark it, and count one View, T27 — Serve Fresh, Popular, and My feed, T30 — Hide an Article, move its Category, and staff-remove it, T33 — Compose the public Article read and refuse a Guest write, T35 — Report platform statistics to an Administrator, T37 — Relay each schema outbox from its own worker, T44 — Edit and publish a draft on one screen · **Wave:** after drafts and the Block lookup exist.
- **Lane:** shares `apps/content` with T18, T20, T23, and T30 — serialized.

## Why (user story)

> **As a** User
> **I want** to draft an Article, keep the draft as I type, see those edits in a second preview, attach an image, and publish it into one Category
> **So that** readers and followers can see the finished piece
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task publishes only a valid Article, refuses a blocked User, and soft-removes an Article for its author.

## Inlined context

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> Publish returns `ARTICLE_NOT_OWNED` when the caller is not the author, `ACCOUNT_BLOCKED` when the caller is blocked, and `USERNAME_REQUIRED`, `ARTICLE_CATEGORY_REQUIRED`, `ARTICLE_TITLE_REQUIRED`, `ARTICLE_TEXT_REQUIRED`, or `ARTICLE_LANGUAGE_REQUIRED` when the draft is not valid.
>
> — `openapi.yaml §paths, publishMyArticle, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

> Already published Articles stay visible. New publishing is refused while the Block lasts.
>
> — `sad.md §8, Block, abridged` · full text: [sad.md](../sad.md)

> `removed_by` is `author` or `staff` only when `status` is `soft_removed`. Publish and author soft-remove insert `content.outbox_events` in the same transaction.
>
> — `data-model.md §Entities, content.articles status, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `status` | text | `published` or `soft_removed` | update |
| `removed_by` | text | `author` on author withdraw | update |
| `published_at` | timestamptz | set on publish | update |
| `slug` | text | UNIQUE, set on publish | update |
| `outbox_events` | row | same transaction | insert `content.article.published` or `content.article.soft_removed` |

— `data-model.md §Entities, content.articles, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/me/articles/{article_id}/publish` → `200` · errors listed above, plus `429` when the gateway limits edits.
- `POST /api/v1/me/articles/{article_id}/withdraw` → `200` · errors `403 ARTICLE_NOT_OWNED`, `404 ARTICLE_NOT_FOUND`.
- A Moderator calling withdraw is refused. Hide stays a different command.

— `openapi.yaml §paths, withdrawMyArticle, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

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

### AC-32 — cross-context

> **Given** a User who already has published Articles
> **When** a Moderator Blocks that User
> **Then** those already published Articles stay visible, and new publishing is refused while the Block lasts
>
> — `spec.md §5, AC-32, verbatim` · full text: [spec.md](../spec.md)

### AC-38 — happy path

> **Given** a User who owns a published Article
> **When** the User soft-removes it
> **Then** a Guest or a User who is not the author no longer sees it in the feeds or on its page, sees that it is unavailable, with no text and no Comments, and is not told that the author withdrew it. The author sees the text and sees that they withdrew it. The record remains. The Article is not treated as hidden by a Moderator. Staff see the full text only in the admin panel
>
> — `spec.md §5, AC-38, verbatim` · full text: [spec.md](../spec.md)

### AC-41 — authorization

> **Given** a published Article owned by one User
> **When** a different User, or a Moderator, tries to soft-remove it
> **Then** the system refuses, and the Moderator can still hide it with a reason
>
> — `spec.md §5, AC-41, verbatim` · full text: [spec.md](../spec.md)

### AC-43 — domain invariant

> **Given** a User's draft with a title, exactly one Category, a Content language, and text, and with no image
> **When** the User publishes
> **Then** the system publishes the Article, and a Guest sees the text with no image
>
> — `spec.md §5, AC-43, verbatim` · full text: [spec.md](../spec.md)

### AC-44 — error

> **Given** a User's draft with a title and exactly one Category and with no text
> **When** the User tries to publish
> **Then** the system blocks publication and tells the User that the text must be present
>
> — `spec.md §5, AC-44, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Publish only when the owner has a Username, exactly one Category, a title, text, and a Content language
- [ ] Allow publish with no image. Ask the users service whether the caller is blocked. Refuse with `ACCOUNT_BLOCKED`
- [ ] On author withdraw set `status` `soft_removed` and `removed_by` `author`. Do not mark it hidden
- [ ] Insert the outbox row in the same transaction. Refuse withdraw from anyone who is not the author

## Edge cases

| Case | Behaviour |
|---|---|
| No Category, or more than one | Return `ARTICLE_CATEGORY_REQUIRED` |
| No title | Return `ARTICLE_TITLE_REQUIRED` |
| No text | Return `ARTICLE_TEXT_REQUIRED` |
| No Username | Return `USERNAME_REQUIRED` |
| Blocked author publishes | Return `ACCOUNT_BLOCKED`. Leave existing published rows visible |
| Moderator withdraws | Return `ARTICLE_NOT_OWNED` |

## Definition of Done

- [ ] Vitest covers AC-08, AC-09, AC-10, AC-43, AC-44, AC-38, AC-41, and the publish refusal in AC-32
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
