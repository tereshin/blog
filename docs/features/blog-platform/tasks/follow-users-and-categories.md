---
id: T26
title: "Follow and unfollow Users and Categories"
layer: "app"
deps: ["T7", "T14", "T17"]
blocks: ["T27", "T29", "T37", "T41", "T43"]
acs: ["AC-13"]
files_hint: ["apps/social"]
owner: "Backend Lead"
estimate: "S"
context_budget: "S"
status: "done"
---

# T26 — Follow and unfollow Users and Categories

## Place in the sequence

- **Blocked by:** T7 — Promote the social schema migration, T14 — Record a User profile and a unique Username, T17 — Serve Categories and their three translations · **Blocks:** T27 — Serve Fresh, Popular, and My feed, T29 — Deliver in-product Notifications, T37 — Relay each schema outbox from its own worker, T41 — Render the Fresh feed, the Popular feed, and a Category, T43 — Sign in and edit a public profile · **Wave:** after social tables, profiles, and Categories exist.
- **Lane:** own lane.

## Why (user story)

> **As a** User
> **I want** to follow a User and a Category, and to stop following
> **So that** their new Articles come to me
>
> — `spec.md §4, US-07, verbatim` · full text: [spec.md](../spec.md)

This task records the remaining Follow and drops the one the User stopped.

## Inlined context

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

> A write that emits a fact commits the row and an outbox row together. A worker publishes the outbox to RabbitMQ. Consumers are idempotent.
>
> — `sad.md §4, choice 1, abridged` · full text: [sad.md](../sad.md)

> A new User Follow inserts `social.outbox_events`. An unfollow deletes the follow row and does not need a notice. Category Follows have no notice.
>
> — `data-model.md §Entities, social.user_follows, abridged` · full text: [data-model.md](../data-model.md)

> `social.user.followed` is consumed by the notification service.
>
> — `events.md §Event, social.user.followed.v1, abridged` · full text: [events.md](../contracts/events.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `user_follows` | PK (`follower_id`, `following_id`) |  | insert or delete |
| `category_follows` | PK (`user_id`, `category_id`) |  | insert or delete |

— `data-model.md §Entities, social.user_follows, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST` and `DELETE /api/v1/users/{user_id}/follow` · errors `404 USER_NOT_FOUND`.
- `POST` and `DELETE /api/v1/categories/{category_id}/follow` · errors `404 CATEGORY_NOT_FOUND`.

— `openapi.yaml §paths, followUser, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-13 — happy path

> **Given** a User, another User, and a Category
> **When** the first User follows that User and that Category, then stops following one of them
> **Then** the system records the remaining Follow and drops the one they stopped
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [x] Add `apps/social`. Insert or delete the Follow pair
- [x] Insert `social.user.followed` only on a new User Follow, in the same transaction
- [x] Confirm the target User or Category exists over HTTP. Do not join those schemas

## Edge cases

| Case | Behaviour |
|---|---|
| Unfollow one of two Follows | Delete only that pair |
| Unknown User | Return `USER_NOT_FOUND` |

## Definition of Done

- [x] Vitest covers AC-13
- [x] every Hard Rule inlined above still holds
- [x] lint and typecheck are clean for the touched package
