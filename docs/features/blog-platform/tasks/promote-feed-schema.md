---
id: T10
title: "Promote the feed schema migration"
layer: "migration"
deps: ["T9"]
blocks: ["T11", "T27"]
acs: []
files_hint: ["docs/features/blog-platform/migrations/10_create_feed.up.sql", "docs/features/blog-platform/migrations/10_create_feed.down.sql"]
owner: "Backend Lead"
estimate: "S"
context_budget: "M"
status: "done"
---

# T10 — Promote the feed schema migration

## Place in the sequence

- **Blocked by:** T9 — Promote the notifications schema migration · **Blocks:** T11 — Promote the rate-limit seed migration, T27 — Serve Fresh, Popular, and My feed · **Wave:** immediately after T9, journal order.
- **Lane:** shares the Drizzle journal with the other migration tasks — serialized in this order.

## Why (user story)

> **As a** Guest
> **I want** to open the Fresh feed and the Popular feed
> **So that** I can find new and active writing
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task promotes the single Popular-weights row. My feed has no inbox table.

## Inlined context

> Each NestJS service owns one schema and is the only writer of that schema. No SQL join across schemas. Synchronous reads and commands go through the gateway over HTTP.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Primary keys are app-generated UUIDv7. A Firebase UID is a lookup key on the user, never the primary key.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Chosen: Option 1. Inside a service, a controller accepts the request and a service holds the business rules. Persistence goes through that service's Drizzle client.
>
> — `0002-own-data-per-nestjs-service.md §Decision outcome, schema per service, abridged` · full text: [0002-own-data-per-nestjs-service.md](../../../adr/0002-own-data-per-nestjs-service.md)

> Chosen: Option 1. Drizzle stays a thin SQL layer, which fits one client per schema. UUIDv7 is still a UUID, and it sorts by creation time so cursor pages do not depend on `OFFSET`.
>
> — `0003-use-drizzle-and-uuidv7.md §Decision outcome, UUIDv7, abridged` · full text: [0003-use-drizzle-and-uuidv7.md](../../../adr/0003-use-drizzle-and-uuidv7.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| see staged SQL |  | `views_weight`, `likes_weight`, `comments_weight`, `bookmarks_weight`, `age_decay` numeric NOT NULL. Seed id `018f3c2a-7b10-7c3e-8f21-000000000002` at 1, 1, 1, 1, 1 | promote existing |

Staged pair `10_create_feed.up.sql` / `10_create_feed.down.sql`. `implement` promotes it into `packages/database/migrations`.

— `data-model.md §Entities, feed.popular_weights, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

This task asserts no spec §5 id. Later tasks assert the criteria that read this slice.

## Checklist

- [ ] Promote `docs/features/blog-platform/migrations/10_create_feed.up.sql` and `docs/features/blog-platform/migrations/10_create_feed.down.sql` into `packages/database/migrations` without editing the SQL
- [ ] Append the matching journal row after the previous migration only
- [ ] Apply with `pnpm --filter @blog/database db:migrate` and revert with `db:rollback`
- [ ] Leave cross-schema references as uuid columns with no foreign key

## Edge cases

| Case | Behaviour |
|---|---|
| Down file missing | Rollback stops and reports the missing sibling. Do not invent a down script |
| Cross-schema foreign key in the SQL | Refuse the promotion and keep the staged file's rule: no SQL across schemas |

## Definition of Done

- [ ] `db:migrate` applies `10_create_feed.up.sql` and `db:rollback` runs `10_create_feed.down.sql` and deletes that journal row
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
