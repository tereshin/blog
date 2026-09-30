---
id: T3
title: "Promote the content schema migration"
layer: "migration"
deps: ["T2"]
blocks: ["T4", "T18"]
acs: []
files_hint: ["docs/features/blog-platform/migrations/03_create_content.up.sql", "docs/features/blog-platform/migrations/03_create_content.down.sql"]
owner: "Backend Lead"
estimate: "S"
context_budget: "M"
status: "done"
---

# T3 — Promote the content schema migration

## Place in the sequence

- **Blocked by:** T2 — Promote the categories schema migration · **Blocks:** T4 — Promote the media schema migration, T18 — Save Article drafts with a version check and sanitized HTML · **Wave:** immediately after T2, journal order.
- **Lane:** shares the Drizzle journal with the other migration tasks — serialized in this order.

## Why (user story)

> **As a** User
> **I want** to draft an Article, keep the draft as I type, see those edits in a second preview, attach an image, and publish it into one Category
> **So that** readers and followers can see the finished piece
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task promotes the schema a draft, a published Article, and its revisions are stored in.

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
| see staged SQL |  | `status` text NOT NULL default `draft` · `version` integer NOT NULL default 1 · `slug` text UNIQUE nullable · `editor_json` jsonb NOT NULL · `rendered_html` text NOT NULL | promote existing |

Staged pair `03_create_content.up.sql` / `03_create_content.down.sql`. `implement` promotes it into `packages/database/migrations`.

— `data-model.md §Entities, content.articles, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

This task asserts no spec §5 id. Later tasks assert the criteria that read this slice.

## Checklist

- [ ] Promote `docs/features/blog-platform/migrations/03_create_content.up.sql` and `docs/features/blog-platform/migrations/03_create_content.down.sql` into `packages/database/migrations` without editing the SQL
- [ ] Append the matching journal row after the previous migration only
- [ ] Apply with `pnpm --filter @blog/database db:migrate` and revert with `db:rollback`
- [ ] Leave cross-schema references as uuid columns with no foreign key

## Edge cases

| Case | Behaviour |
|---|---|
| Down file missing | Rollback stops and reports the missing sibling. Do not invent a down script |
| Cross-schema foreign key in the SQL | Refuse the promotion and keep the staged file's rule: no SQL across schemas |

## Definition of Done

- [ ] `db:migrate` applies `03_create_content.up.sql` and `db:rollback` runs `03_create_content.down.sql` and deletes that journal row
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
