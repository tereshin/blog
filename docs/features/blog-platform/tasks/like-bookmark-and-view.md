---
id: T25
title: "Like an Article, Bookmark it, and count one View"
layer: "app"
deps: ["T6", "T13", "T19"]
blocks: ["T27", "T33", "T37", "T38", "T42", "T45"]
acs: ["AC-02", "AC-15", "AC-17", "AC-19", "AC-20"]
files_hint: ["apps/engagement"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T25 — Like an Article, Bookmark it, and count one View

## Place in the sequence

- **Blocked by:** T6 — Promote the engagement schema migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T19 — Publish an Article and let the author withdraw it · **Blocks:** T27 — Serve Fresh, Popular, and My feed, T33 — Compose the public Article read and refuse a Guest write, T37 — Relay each schema outbox from its own worker, T38 — Flush view increments from Redis, T42 — Render a published Article with Comments and live counts, T45 — Show My feed and private Bookmarks · **Wave:** after engagement tables and a published Article exist.
- **Lane:** own lane.

## Why (user story)

> **As a** User
> **I want** to Like an Article and take that Like back
> **So that** the author and other readers see how many people endorse it
>
> — `spec.md §4, US-09, verbatim` · full text: [spec.md](../spec.md)

This task toggles an Article Like, stores a private Bookmark, likes a Comment, and dedupes a View for 30 minutes.

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

> Chosen: Option 1. Redis holds the dedupe key and the increment. After a flush, a cached Article read does not need Redis to show the stored count.
>
> — `0012-flush-view-increments-from-redis.md §Decision outcome, Redis then Postgres, abridged` · full text: [0012-flush-view-increments-from-redis.md](../adr/0012-flush-view-increments-from-redis.md)

> Chosen: Option 1. The View count is not on the live channel.
>
> — `0006-leave-view-counts-off-live-channel.md §Decision outcome, views off the socket, abridged` · full text: [0006-leave-view-counts-off-live-channel.md](../adr/0006-leave-view-counts-off-live-channel.md)

> A View counts after the Article stays visible for 3 seconds. The same viewer does not add another View for 30 minutes. A Guest is the same viewer for the same browser session. A User is the same viewer when that User returns.
>
> — `sad.md §8, View counting, abridged` · full text: [sad.md](../sad.md)

> Redis key `view:{articleId}:{viewerId}` for 30 minutes, and the unflushed increment. A Bookmark does not insert an outbox row. Article Like and Unlike do.
>
> — `data-model.md §Outside PostgreSQL, Redis views, abridged` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `article_likes` | PK (`article_id`, `user_id`) | one Like | insert or delete |
| `article_stats.like_count` | bigint | same transaction as the Like | update |
| `bookmarks` | PK (`user_id`, `article_id`) | private list | insert or delete |
| `comment_likes` | PK (`comment_id`, `user_id`) |  | insert or delete |
| `article_stats.view_count` | bigint | durable count, not the Redis delta | read here, flush in T38 |

— `data-model.md §Entities, engagement.article_stats, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /api/v1/articles/{article_id}/like` toggles. `POST /api/v1/comments/{comment_id}/like` toggles.
- `POST` and `DELETE /api/v1/articles/{article_id}/bookmark`. `GET /api/v1/me/bookmarks` is only the caller.
- `POST /api/v1/articles/{article_id}/views` records one View after the client reports 3 seconds. A repeat inside 30 minutes does not increment.
- Errors: `404 ARTICLE_NOT_FOUND`, `401` when the caller is a Guest on a write.

— `openapi.yaml §paths, toggleArticleLike, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-02 — domain invariant

> **Given** a Guest or a User has already added a View to an Article in the last 30 minutes
> **When** that same viewer keeps the Article open or opens it again inside those 30 minutes
> **Then** the system does not add another View. A Guest is the same viewer when the same browser session returns. A User is the same viewer when that User returns. A different browser session is a different Guest viewer
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

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

### AC-19 — happy path

> **Given** a User and a published Article
> **When** the User Bookmarks it and later removes the Bookmark
> **Then** the Article appears in that User's private Bookmark list and then disappears from that list
>
> — `spec.md §5, AC-19, verbatim` · full text: [spec.md](../spec.md)

### AC-20 — authorization

> **Given** a User has Bookmarked an Article
> **When** a Guest or a different User tries to open that Bookmark list
> **Then** the system does not show it
>
> — `spec.md §5, AC-20, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Add `apps/engagement`. Toggle the Article Like and adjust `like_count` in one transaction with `engagement.article.liked` or `engagement.article.unliked`
- [x] Toggle a Comment Like the same way
- [x] Add and remove a Bookmark for the caller only. Do not emit an outbox row for a Bookmark
- [x] Set the Redis dedupe key for 30 minutes. A second View from that viewer does not increment. Leave the Postgres flush to T38

## Edge cases

| Case | Behaviour |
|---|---|
| Second Like | Remove the row and lower `like_count` by one |
| Same Guest browser session inside 30 minutes | Do not add a View |
| Different browser session | Count a new Guest viewer |
| Another User opens the Bookmark list | Do not return it |

## Definition of Done

- [x] Vitest covers AC-15, AC-19, AC-20, AC-02, and the Comment-like half of AC-17
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
