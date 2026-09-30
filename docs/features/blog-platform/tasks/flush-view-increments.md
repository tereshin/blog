---
id: T38
title: "Flush view increments from Redis"
layer: "infra"
deps: ["T25", "T13"]
blocks: []
acs: ["AC-02"]
files_hint: ["apps/engagement/src/view-flush"]
owner: "Backend Lead"
estimate: "S"
context_budget: "S"
status: "todo"
---

# T38 — Flush view increments from Redis

## Place in the sequence

- **Blocked by:** T25 — Like an Article, Bookmark it, and count one View, T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope · **Blocks:** none · **Wave:** after the Redis increment exists.
- **Lane:** shares `apps/engagement` with T25 — serialized.

## Why (user story)

> **As a** Guest
> **I want** to read a published Article with its Comments and counts
> **So that** I can follow a piece without signing in
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task folds the Redis delta into `article_stats.view_count`.

## Inlined context

> Chosen: Option 1. After a flush, a cached Article read does not need Redis to show the stored count.
>
> — `0012-flush-view-increments-from-redis.md §Decision outcome, flush, abridged` · full text: [0012-flush-view-increments-from-redis.md](../adr/0012-flush-view-increments-from-redis.md)

> A Redis failure before view flush loses increments that are not in Postgres yet. Short flush interval. The durable count remains the engagement row.
>
> — `sad.md §11, Redis view loss, abridged` · full text: [sad.md](../sad.md)

> The view-flush worker does not publish a domain event.
>
> — `events.md §view flush, not an event, abridged` · full text: [events.md](../contracts/events.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `article_stats.view_count` | bigint | add the Redis delta | update |

— `data-model.md §Entities, engagement.article_stats, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.


## Acceptance criteria

### AC-02 — domain invariant

> **Given** a Guest or a User has already added a View to an Article in the last 30 minutes
> **When** that same viewer keeps the Article open or opens it again inside those 30 minutes
> **Then** the system does not add another View. A Guest is the same viewer when the same browser session returns. A User is the same viewer when that User returns. A different browser session is a different Guest viewer
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add the engagement view-flush process. Add the Redis delta to `view_count` and clear the flushed delta
- [ ] Do not insert an outbox row and do not push a socket event
- [ ] Keep the 30-minute dedupe key in place

## Edge cases

| Case | Behaviour |
|---|---|
| Second View inside 30 minutes | The delta was never incremented. Flush adds nothing for that attempt |
| Redis miss | Leave the Postgres count as it is |

## Definition of Done

- [ ] Vitest covers AC-02 after a flush: one viewer produced one durable increment
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
