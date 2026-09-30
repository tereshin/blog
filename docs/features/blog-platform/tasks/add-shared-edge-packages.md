---
id: T13
title: "Add Firebase verification, Redis, RabbitMQ, and the event envelope"
layer: "wiring"
deps: ["T12"]
blocks: ["T14", "T17", "T21", "T22", "T25", "T27", "T29", "T32", "T33", "T36", "T37", "T38"]
acs: []
files_hint: ["packages/firebase", "packages/redis", "packages/rabbitmq", "packages/contracts", "packages/logger"]
owner: "Backend Lead"
estimate: "M"
context_budget: "L"   # justified: shared clients are one package set later services import
status: "done"
---

# T13 — Add Firebase verification, Redis, RabbitMQ, and the event envelope

## Place in the sequence

- **Blocked by:** T12 — Add Redis, RabbitMQ, MinIO, and typed config · **Blocks:** T14 — Record a User profile and a unique Username, T17 — Serve Categories and their three translations, T21 — Issue presigned image uploads, T22 — Comment, reply, and mention on a visible Article, T25 — Like an Article, Bookmark it, and count one View, T27 — Serve Fresh, Popular, and My feed, T29 — Deliver in-product Notifications, T32 — List open Complaints and dismiss one, T33 — Compose the public Article read and refuse a Guest write, T36 — Count rate limits with a sliding window, T37 — Relay each schema outbox from its own worker, T38 — Flush view increments from Redis · **Wave:** after typed config exists.
- **Lane:** own lane after T12.

## Why (user story)

> **As a** Guest
> **I want** to read a published Article with its Comments and counts
> **So that** I can follow a piece without signing in
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task adds the shared clients every later service imports. It does not implement a product route.

## Inlined context

> Envelope fields `eventId`, `correlationId`, `causationId`, `timestamp`, `producer`, `eventVersion`. Outbox in the owning schema. Idempotent consumers.
>
> — `sad.md §8, Events, abridged` · full text: [sad.md](../sad.md)

> Required fields: `eventId`, `eventType`, `eventVersion`, `timestamp`, `producer`, `data`. Delivery is at-least-once. A new optional field is fine. Removing or renaming a field is a new version.
>
> — `events.md §Envelope, required fields, abridged` · full text: [events.md](../contracts/events.md)

> Firebase ID token verified at the gateway. Staff routes also require the second-factor claim. Public sign-in does not open admin routes.
>
> — `sad.md §8, Authentication, abridged` · full text: [sad.md](../sad.md)

> API errors are the JSON envelope `{ "error": { "code", "params" } }` with no user-facing sentence. The client translates `code`.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

> Primary keys are app-generated UUIDv7. A Firebase UID is a lookup key on the user, never the primary key.
>
> — `sad.md §2, Conventions, abridged` · full text: [sad.md](../sad.md)

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

- [ ] Add `packages/firebase` to verify an ID token and to read the second-factor claim
- [ ] Add `packages/redis` and `packages/rabbitmq` clients. RabbitMQ confirms, manual ack, retry, then a dead letter. Leave attempt count and queue names open as `events.md` states
- [ ] Add `packages/contracts` with the error envelope and the event envelope
- [ ] Add `packages/logger` JSON logs with request id and correlation id

## Edge cases

| Case | Behaviour |
|---|---|
| Token missing | Verification fails closed |
| Broker publish inside a user request | This package does not publish from the request. The outbox worker does |

## Definition of Done

- [ ] Vitest covers token rejection, the envelope required fields, and a logger line that includes the request id
- [ ] every Hard Rule inlined above still holds
- [ ] lint and typecheck are clean for the touched package
