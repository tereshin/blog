---
id: T6
title: "Promote the engagement schema migration"
layer: "migration"
deps: ["T5"]
blocks: ["T7", "T25"]
acs: []
files_hint: ["docs/features/blog-platform/migrations/06_create_engagement.up.sql", "docs/features/blog-platform/migrations/06_create_engagement.down.sql"]
owner: "Backend Lead"
estimate: "S"
context_budget: "M"
status: "done"
---

# T6 — Promote the engagement schema migration

## Place in the sequence

- **Blocked by:** T5 — Promote the comments schema migration · **Blocks:** T7 — Promote the social schema migration, T25 — Like an Article, Bookmark it, and count one View · **Wave:** immediately after T5, journal order.
- **Lane:** shares the Drizzle journal with the other migration tasks — serialized in this order.

## Why (user story)

> **As a** User
> **I want** to Like an Article and take that Like back
> **So that** the author and other readers see how many people endorse it
>
> — `spec.md §4, US-09, verbatim` · full text: [spec.md](../spec.md)

This task promotes the schema a Like, a Bookmark, and the durable counts are stored in.

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
| see staged SQL |  | `article_likes` PK (`article_id`, `user_id`) · `bookmarks` PK (`user_id`, `article_id`) · `article_stats.view_count` bigint NOT NULL default 0 | promote existing |

Staged pair `06_create_engagement.up.sql` / `06_create_engagement.down.sql`. `implement` promotes it into `packages/database/migrations`.

— `data-model.md §Entities, engagement.article_likes, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

This task asserts no spec §5 id. Later tasks assert the criteria that read this slice.

## Checklist

- [ ] Promote `docs/features/blog-platform/migrations/06_create_engagement.up.sql` and `docs/features/blog-platform/migrations/06_create_engagement.down.sql` into `packages/database/migrations` without editing the SQL
- [ ] Append the matching journal row after the previous migration only
- [ ] Apply with `pnpm --filter @blog/database db:migrate` and revert with `db:rollback`
- [ ] Leave cross-schema references as uuid columns with no foreign key

## Edge cases

| Case | Behaviour |
|---|---|
| Down file missing | Rollback stops and reports the missing sibling. Do not invent a down script |
| Cross-schema foreign key in the SQL | Refuse the promotion and keep the staged file's rule: no SQL across schemas |

## Definition of Done

- [ ] `db:migrate` applies `06_create_engagement.up.sql` and `db:rollback` runs `06_create_engagement.down.sql` and deletes that journal row
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
