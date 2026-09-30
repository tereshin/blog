---
id: T20
title: "Keep the previous Article version on a published save"
layer: "app"
deps: ["T18"]
blocks: ["T44"]
acs: ["AC-11"]
files_hint: ["apps/content"]
owner: "Backend Lead"
estimate: "S"
context_budget: "M"
status: "done"
---

# T20 — Keep the previous Article version on a published save

## Place in the sequence

- **Blocked by:** T18 — Save Article drafts with a version check and sanitized HTML · **Blocks:** T44 — Edit and publish a draft on one screen · **Wave:** after a draft save exists; runs in the content lane beside publish.
- **Lane:** shares `apps/content` with T18, T19, T23, and T30 — serialized.

## Why (user story)

> **As a** User
> **I want** to change my published Article without losing the previous version
> **So that** I can correct it and readers see the latest text
>
> — `spec.md §4, US-06, verbatim` · full text: [spec.md](../spec.md)

This task records the previous version when the author saves a published Article, and exposes no history browser.

## Inlined context

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> A text revision updates `content.articles`, inserts `content.article_revisions` for the previous version, and inserts an outbox row so a cached page can drop.
>
> — `data-model.md §Entities, article_revisions, abridged` · full text: [data-model.md](../data-model.md)

> Earlier Article versions stay recorded and are not browsable.
>
> — `sad.md §11, Accepted debt, abridged` · full text: [sad.md](../sad.md)

> A published save emits `content.article.revised`. The feed drops cached pages. Readers are not given a version list.
>
> — `events.md §Event, content.article.revised.v1, abridged` · full text: [events.md](../contracts/events.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `article_revisions.version` | integer | the version that was replaced | insert |
| `article_revisions.editor_json` | jsonb | previous source | insert |
| `articles.version` | integer | incremented | update |

— `data-model.md §Entities, content.article_revisions, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `PATCH /api/v1/me/articles/{article_id}` on a published Article returns the new text.
- No list-revisions route.

— `openapi.yaml §paths, updateMyArticle, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-11 — happy path

> **Given** a User who owns a published Article
> **When** the User changes the text and saves
> **Then** readers see the new text, the previous version remains recorded, and neither readers nor the author browse earlier versions in this release
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] On a matching save of a published Article, copy the previous title, editor JSON, and HTML into `article_revisions`
- [ ] Update the live row and insert `content.article.revised` in that same transaction
- [ ] Do not add a route that lists earlier versions

## Edge cases

| Case | Behaviour |
|---|---|
| Version mismatch | Do not insert a revision. Return `ARTICLE_VERSION_CONFLICT` |
| Author asks for the previous text in the API | No such route |

## Definition of Done

- [ ] Vitest covers AC-11: the live text changes, the previous version row exists, and no history endpoint is registered
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
