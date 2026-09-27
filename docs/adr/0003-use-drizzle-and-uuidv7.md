---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: ""
ticket: ""
---

# 0003 — Use Drizzle and app-generated UUIDv7

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (survey confirmation)

## Context

`docs/TASK.md` says identifiers are UUIDs and `docs/DECOMPOSITION.md` allows either Drizzle or Prisma for `packages/database`. Lists of articles, comments, messages, followers, and bookmarks use cursor pagination. The foundation has to pick one client and one UUID form before the first migration.

## Decision drivers

- Each service owns a schema and must not touch another schema (`docs/TASK.md` §42).
- Migrations must apply and roll back (`docs/DECOMPOSITION.md`, shared Definition of Done).
- Cursor pagination is the list API (`docs/TASK.md` §32). A time-ordered id keeps inserts clustered.
- The gateway maps a Firebase UID to an internal user UUID. The Firebase UID is not the primary key (`docs/TASK.md` §6.1, §64 rule 8).

## Considered options

1. **Drizzle with app-generated UUIDv7.** Table definitions live in TypeScript next to the service. `drizzle-kit` emits SQL migrations per schema. The application generates the id.
2. **Prisma with a single generated client.** One schema language and a studio UI. The client expects a broader schema graph than "this service, this schema".
3. **Drizzle with random UUIDv4.** Matches the brief's word "UUID" literally. New rows scatter across the index.

## Decision outcome

**Chosen:** Option 1. Drizzle stays a thin SQL layer, which fits one client per schema. UUIDv7 is still a UUID, and it sorts by creation time so cursor pages do not depend on `OFFSET`. The repository owner confirmed this pair when confirming the foundation bundle.

## Consequences

**Positive**

- A migration is SQL in the repo, with a down path. `data-model` can follow `drizzle-kit`.
- Ids are created in the application, so a service can return the id before the insert round-trip finishes, and tests can pin ids.
- Cursor pagination can order on the id when the row's time and the id's time agree.

**Negative**

- There is no Prisma Studio. Inspecting rows is SQL or another client.
- UUIDv7 leaks creation time to anyone who can see the id. Profile and article ids are already public in URLs that also expose publish time, so this is acceptable for those resources. It is a poor fit for any id that must not reveal when the row was created.

**Neutral**

- Switching to Prisma later means rewriting `packages/database` and the migrations. Switching to UUIDv4 later does not require a new column type, but it changes ordering assumptions in cursor queries.

## Links

- Product brief: [TASK.md](../TASK.md) §6.2, §32, §42
- Decomposition: [DECOMPOSITION.md](../DECOMPOSITION.md) task E1-1
- Related ADR: [0002](0002-own-data-per-nestjs-service.md)
