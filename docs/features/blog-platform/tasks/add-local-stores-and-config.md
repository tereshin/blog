---
id: T12
title: "Add Redis, RabbitMQ, MinIO, and typed config"
layer: "wiring"
deps: []
blocks: ["T13"]
acs: []
files_hint: ["docker-compose.yml", "packages/config"]
owner: "Backend Lead"
estimate: "M"
context_budget: "M"
status: "done"
---

# T12 — Add Redis, RabbitMQ, MinIO, and typed config

## Place in the sequence

- **Blocked by:** none · **Blocks:** T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope · **Wave:** starts with T1 and T40; no schema is required.
- **Lane:** own lane.

## Why (user story)

> **As a** Guest
> **I want** to open the Fresh feed and the Popular feed
> **So that** I can find new and active writing
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task adds the stores a cached feed and a later worker need. It does not boot empty domain apps.

## Inlined context

> Local compose today starts PostgreSQL 18 only. The other stores are added with the first service that needs them, not as empty infrastructure ahead of that task.
>
> — `sad.md §7, Deployment view, abridged` · full text: [sad.md](../sad.md)

> Local compose has PostgreSQL only. Redis, RabbitMQ, MinIO, and the domain services are not in the workspace yet. Add each store and each app with the task that first needs it. Do not stub the full service list in the skeleton.
>
> — `sad.md §11, RISK compose, abridged` · full text: [sad.md](../sad.md)

> Inside each NestJS app the layers are a controller, a service, and a Drizzle module for that app's schema. Business rules do not live in React components. Empty apps are not stubbed ahead of the task that needs them.
>
> — `sad.md §5, Internal decomposition, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

This task asserts no spec §5 id. Later tasks assert the criteria that read this slice.

## Checklist

- [ ] Add Redis 8, RabbitMQ, and MinIO to `docker-compose.yml` beside the existing Postgres service
- [ ] Add `packages/config` that exits the process when required env is missing
- [ ] Document the new variables in `.env.example` without committing secrets
- [ ] Do not add `apps/users` or any other domain app in this task

## Edge cases

| Case | Behaviour |
|---|---|
| Invalid env | The process exits before it listens |
| A domain app stub | Do not create it here |

## Definition of Done

- [ ] Vitest asserts `packages/config` rejects a missing `DATABASE_URL` and a missing `REDIS_URL`
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
