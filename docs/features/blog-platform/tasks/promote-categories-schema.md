---
id: T2
title: "Promote the categories schema migration"
layer: "migration"
deps: ["T1"]
blocks: ["T3", "T17"]
acs: []
files_hint: ["docs/features/blog-platform/migrations/02_create_categories.up.sql", "docs/features/blog-platform/migrations/02_create_categories.down.sql"]
owner: "Backend Lead"
estimate: "S"
context_budget: "M"
status: "todo"
---

# T2 — Promote the categories schema migration

## Place in the sequence

- **Blocked by:** T1 — Promote the users schema migration · **Blocks:** T3 — Promote the content schema migration, T17 — Serve Categories and their three translations · **Wave:** immediately after T1, journal order.
- **Lane:** shares the Drizzle journal with the other migration tasks — serialized in this order.

## Why (user story)

> **As an** Administrator
> **I want** to manage Categories and their three translations, assign roles, change Popular feed weights, see platform statistics, hide, Block, handle a Complaint, and soft-remove an Article
> **So that** the public catalog and the staff stay correct
>
> — `spec.md §4, US-18, verbatim` · full text: [spec.md](../spec.md)

This task promotes the schema an Administrator's Category and its three names are stored in.

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
| see staged SQL |  | `categories.categories.slug` text NOT NULL UNIQUE · `category_translations` PK (`category_id`, `locale`) with `locale` `en`, `sr-Latn`, or `ru` | promote existing |

Staged pair `02_create_categories.up.sql` / `02_create_categories.down.sql`. `implement` promotes it into `packages/database/migrations`.

— `data-model.md §Entities, categories.categories, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

This task asserts no spec §5 id. Later tasks assert the criteria that read this slice.

## Checklist

- [ ] Promote `docs/features/blog-platform/migrations/02_create_categories.up.sql` and `docs/features/blog-platform/migrations/02_create_categories.down.sql` into `packages/database/migrations` without editing the SQL
- [ ] Append the matching journal row after the previous migration only
- [ ] Apply with `pnpm --filter @blog/database db:migrate` and revert with `db:rollback`
- [ ] Leave cross-schema references as uuid columns with no foreign key

## Edge cases

| Case | Behaviour |
|---|---|
| Down file missing | Rollback stops and reports the missing sibling. Do not invent a down script |
| Cross-schema foreign key in the SQL | Refuse the promotion and keep the staged file's rule: no SQL across schemas |

## Definition of Done

- [ ] `db:migrate` applies `02_create_categories.up.sql` and `db:rollback` runs `02_create_categories.down.sql` and deletes that journal row
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
