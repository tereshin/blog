---
id: T33
title: "Compose the public Article read and refuse a Guest write"
layer: "ports"
deps: ["T13", "T14", "T19", "T22", "T25", "T36"]
blocks: ["T34", "T42", "T43"]
acs: ["AC-01", "AC-16"]
files_hint: ["apps/api-gateway/src/public", "apps/api-gateway/src/app.module.ts"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "todo"
---

# T33 — Compose the public Article read and refuse a Guest write

## Place in the sequence

- **Blocked by:** T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T14 — Record a User profile and a unique Username, T19 — Publish an Article and let the author withdraw it, T22 — Comment, reply, and mention on a visible Article, T25 — Like an Article, Bookmark it, and count one View, T36 — Count rate limits with a sliding window · **Blocks:** T34 — Require the staff second factor on admin routes, T42 — Render a published Article with Comments and live counts, T43 — Sign in and edit a public profile · **Wave:** after the read dependencies and the rate-limit middleware exist.
- **Lane:** shares `apps/api-gateway/src/app.module.ts` with T32, T34, T35, and T36 — serialized.

## Why (user story)

> **As a** Guest
> **I want** to read a published Article with its Comments and counts
> **So that** I can follow a piece without signing in
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task returns one Article payload for the public site and turns a Guest write into a sign-in request.

## Inlined context

> Chosen: Option 1. One composition keeps the uncached clock on the gateway. The public site stays a renderer of one read.
>
> — `0003-compose-public-article-read-in-gateway.md §Decision outcome, one payload, abridged` · full text: [0003-compose-public-article-read-in-gateway.md](../adr/0003-compose-public-article-read-in-gateway.md)

> A Guest or a User opens a published Article and sees the text, the images, the Comments, and the Like, Comment, and View counts.
>
> — `sad.md §6, Read a published article, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Latency p95 of a cached feed or Article read is ≤ 100 ms. Latency p95 of an uncached feed or Article read is ≤ 300 ms.
>
> — `sad.md §6, Quality, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.


## API contract

- `GET /api/v1/articles/{slug}` and `GET /api/v1/articles/id/{article_id}` → `200` composed payload · `404 ARTICLE_NOT_FOUND`.
- Guest `POST` for Like, Comment, Follow, Bookmark, publish, or a Direct message returns `401 AUTH_REQUIRED` and writes nothing.

— `openapi.yaml §paths, getArticleBySlug, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 — happy path

> **Given** a published Article with Comments and counts
> **When** a Guest opens it
> **Then** the Guest sees the Article text, its images, its Comments, and the Like, Comment, and View counts
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — authorization

> **Given** a Guest viewing a published Article
> **When** the Guest tries to Like, Comment, Follow, Bookmark, publish, or send a Direct message
> **Then** the system does not record the action and asks the Guest to sign in
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Compose Article, images, Comments, and counts by calling the owning services. Do not query their schemas
- [ ] Record server timing on the composed read
- [ ] Reject a Guest write with `AUTH_REQUIRED` before the command reaches the owning service

## Edge cases

| Case | Behaviour |
|---|---|
| Guest Likes | Return `AUTH_REQUIRED` and do not insert a Like |
| Hidden or withdrawn slug for a reader | Unavailable payload, no text |
| Author reads their draft | Author payload from the content service |

## Definition of Done

- [ ] Vitest covers AC-01 for the composed payload and AC-16 for a Guest write
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
