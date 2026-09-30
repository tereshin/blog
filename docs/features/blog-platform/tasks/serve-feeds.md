---
id: T27
title: "Serve Fresh, Popular, and My feed"
layer: "app"
deps: ["T10", "T13", "T19", "T25", "T26", "T14"]
blocks: ["T41", "T45", "T51"]
acs: ["AC-03", "AC-14", "AC-32", "AC-33", "AC-46"]
files_hint: ["apps/feed"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T27 — Serve Fresh, Popular, and My feed

## Place in the sequence

- **Blocked by:** T10 — Promote the feed schema migration, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope, T19 — Publish an Article and let the author withdraw it, T25 — Like an Article, Bookmark it, and count one View, T26 — Follow and unfollow Users and Categories, T14 — Record a User profile and a unique Username · **Blocks:** T41 — Render the Fresh feed, the Popular feed, and a Category, T45 — Show My feed and private Bookmarks, T51 — Manage Categories, roles, and Popular weights · **Wave:** after published Articles, follows, counts, and the weights row exist.
- **Lane:** own lane.

## Why (user story)

> **As a** Guest
> **I want** to open the Fresh feed and the Popular feed
> **So that** I can find new and active writing
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task lists the three feeds, applies a Content-language limit, and caches pages in Redis.

## Inlined context

> Chosen: Option 1. My feed is assembled on read. A new Follow or an unfollow is correct on the next read.
>
> — `0001-assemble-my-feed-on-read.md §Decision outcome, assemble on read, abridged` · full text: [0001-assemble-my-feed-on-read.md](../adr/0001-assemble-my-feed-on-read.md)

> Chosen: Option 1. Feed pages are cached in Redis and dropped when a publish, hide, or soft-remove event arrives.
>
> — `0004-cache-feed-pages-in-redis.md §Decision outcome, Redis page cache, abridged` · full text: [0004-cache-feed-pages-in-redis.md](../adr/0004-cache-feed-pages-in-redis.md)

> A feed page is 20 Articles. Cursor pagination is the only list shape for feeds.
>
> — `sad.md §6, Feed page, verbatim` · full text: [sad.md](../sad.md)

> Seeded at 1, 1, 1, 1, 1, which is the equal-weight default until the open weight question is closed. There is no inbox of Articles in this schema.
>
> — `data-model.md §Entities, feed.popular_weights, abridged` · full text: [data-model.md](../data-model.md)

> Starting weights of the Popular feed score stay open. Until then the score treats Views, Likes, Comments, and Bookmarks as equal weights, and age lowers the score.
>
> — `sad.md §11, Open weights, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `popular_weights.*_weight` | numeric | single seed row | read, and update on the admin save |

Article rows are read over HTTP from content. Counts are read from engagement. Follows are read from social. No SQL join across schemas.

— `data-model.md §Entities, feed.popular_weights, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `GET /api/v1/feeds/fresh`, `GET /api/v1/feeds/popular`, `GET /api/v1/feeds/mine` → `200` with at most 20 items and a cursor.
- `GET` and `PUT /api/v1/admin/popular-weights` · error `403 ADMIN_ONLY` for a Moderator.
- My feed is not offered to a Guest. A blocked author's already published Articles stay in the lists.

— `openapi.yaml §paths, listFreshFeed, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-03 — happy path

> **Given** several published Articles of different ages and engagement
> **When** a Guest opens the Fresh feed and the Popular feed
> **Then** the Fresh feed lists published Articles newest first, the Popular feed lists them by the current score of Views, Likes, Comments, Bookmarks, and age, Articles of every Content language appear, and My feed is not offered
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — cross-context

> **Given** a User who follows one author and one Category, and published Articles from that author, from that Category, and from neither
> **When** the User opens My feed
> **Then** the feed shows every currently published Article from the followed author and from the followed Category, newest first, each Article once, it does not show the unrelated Articles, and it shows only that User's chosen Content languages when a limit is set
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

### AC-32 — cross-context

> **Given** a User who already has published Articles
> **When** a Moderator Blocks that User
> **Then** those already published Articles stay visible, and new publishing is refused while the Block lasts
>
> — `spec.md §5, AC-32, verbatim` · full text: [spec.md](../spec.md)

### AC-33 — happy path

> **Given** an Administrator in the admin panel
> **When** they create a Category with English, Serbian Latin, and Russian names, assign the Moderator role to a User, and change the Popular feed weights
> **Then** the Category is available for new Articles in all three names, that User can act as a Moderator, and the Popular feed uses the new weights
>
> — `spec.md §5, AC-33, verbatim` · full text: [spec.md](../spec.md)

### AC-46 — cross-context

> **Given** a User
> **When** they set a Content language limit to one or more of English, Serbian Latin, and Russian, or they clear that limit
> **Then** the Fresh feed, the Popular feed, and My feed show only the chosen Content languages, and a cleared limit shows every Content language
>
> — `spec.md §5, AC-46, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Add `apps/feed`. Fresh is published Articles newest first. Popular scores Views, Likes, Comments, Bookmarks, and age with the current weights
- [x] Assemble My feed on read from the caller's Follows, newest first, each Article once
- [x] Apply `content_languages` for a User. NULL shows every Content language. A Guest has no limit
- [x] Cache each page in Redis. Drop Fresh, Popular, and My feed pages when `content.article.published`, `hidden`, `soft_removed`, or `revised` arrives
- [x] Update weights only for an Administrator

## Edge cases

| Case | Behaviour |
|---|---|
| Guest opens My feed | Do not offer it |
| Author is blocked | Keep their published Articles in the feeds |
| Cache hit | Return the page without reassembling |
| Weights still at the seed | Score with equal weights. The spec §8 number is still open |

## Definition of Done

- [x] Vitest covers AC-03, AC-14, AC-46, the weights half of AC-33, and AC-32 visibility
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
