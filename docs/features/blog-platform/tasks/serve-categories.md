---
id: T17
title: "Serve Categories and their three translations"
layer: "app"
deps: ["T2", "T13", "T15"]
blocks: ["T18", "T26", "T41", "T51"]
acs: ["AC-33", "AC-34"]
files_hint: ["apps/categories"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T17 — Serve Categories and their three translations

## Place in the sequence

- **Blocked by:** T2 — Promote the categories schema migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T15 — Assign one role and keep the last Administrator · **Blocks:** T18 — Save Article drafts with a version check and sanitized HTML, T26 — Follow and unfollow Users and Categories, T41 — Render the Fresh feed, the Popular feed, and a Category, T51 — Manage Categories, roles, and Popular weights · **Wave:** after the categories migration, shared packages, and role checks.
- **Lane:** own lane.

## Why (user story)

> **As an** Administrator
> **I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
> **So that** the public catalog and the staff stay correct
>
> — `spec.md §4, US-18, verbatim` · full text: [spec.md](../spec.md)

This task creates a Category with three names and refuses that action for a Moderator.

## Inlined context

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. Inside a service, a controller accepts the request and a service holds the business rules. Persistence goes through that service's Drizzle client.
>
> — `0002-own-data-per-nestjs-service.md §Decision outcome, schema per service, abridged` · full text: [0002-own-data-per-nestjs-service.md](../../../adr/0002-own-data-per-nestjs-service.md)

> A create writes all three locales in one transaction. A missing translation falls back to `en` in the service.
>
> — `data-model.md §Entities, category_translations, abridged` · full text: [data-model.md](../data-model.md)

> An Administrator creates a Category with English, Serbian Latin, and Russian names. A Moderator is refused.
>
> — `sad.md §6, Create a category, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `slug` | text | NOT NULL UNIQUE | insert |
| `locale` | text | PK with `category_id` | insert `en`, `sr-Latn`, `ru` |
| `name` | text | NOT NULL | insert |

Category create also asks the users service to append `category.create`. This app does not write schema `users`.

— `data-model.md §Entities, categories.category_translations, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/admin/categories` → `201` · errors `403 ADMIN_ONLY`, `422 CATEGORY_TRANSLATIONS_REQUIRED`.
- `GET /api/v1/categories` and `GET /api/v1/categories/{slug}` → `200` · error `404 CATEGORY_NOT_FOUND`.
- The service assigns the slug. The response name follows the requested Interface language, falling back to English.

— `openapi.yaml §paths, createCategory, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-33 — happy path

> **Given** an Administrator in the admin panel
> **When** they create a Category with English, Serbian Latin, and Russian names, assign the Moderator role to a User, and change the Popular feed weights
> **Then** the Category is available for new Articles in all three names, that User can act as a Moderator, and the Popular feed uses the new weights
>
> — `spec.md §5, AC-33, verbatim` · full text: [spec.md](../spec.md)

### AC-34 — authorization

> **Given** a Moderator in the admin panel
> **When** they try to create a Category, assign a role, or change Popular feed weights
> **Then** the system refuses those actions
>
> — `spec.md §5, AC-34, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add `apps/categories`. Create the Category and three translation rows in one transaction
- [ ] Call the users audit append for `category.create`. Retry that append. Do not join schema `users`
- [ ] Refuse a Moderator with `ADMIN_ONLY`. Refuse a body that misses a locale
- [ ] Read by slug for the public Category screen

## Edge cases

| Case | Behaviour |
|---|---|
| Only two translations | Return `CATEGORY_TRANSLATIONS_REQUIRED` and commit nothing |
| Moderator create | Return `ADMIN_ONLY` |
| Audit append fails | Retry. Do not roll the Category back into a second writer of schema `users` |

## Definition of Done

- [ ] Vitest covers the Category half of AC-33 and the Category refusal in AC-34
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
