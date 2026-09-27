---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0011 — Relay the outbox from a worker process

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

A publish, a hide, a Comment, and a Direct message must both store the row and emit a fact. The live UI and the feed cache consume that fact. The write latency budget ends when the row is stored, not when every socket has the event.

## Decision drivers

- Write p95 ≤ 300 ms (spec §6).
- Live-update p95 ≤ 500 ms starts when the action is recorded (spec §6).
- Events are at least once, from a transactional outbox, and consumers are idempotent (`docs/adr/0002-own-data-per-nestjs-service.md`).

## Considered options

1. **A worker process per owning service.** The request commits the business row and the outbox row, then returns. The worker of that service publishes to RabbitMQ and retries.
2. **An in-process relay.** The same service publishes after commit and before the HTTP response, so the client waits for the broker.

## Decision outcome

**Chosen:** Option 1. The 300 ms write does not include the broker round trip. The worker reads only its own schema. A single worker that queried every schema would break the ownership rule.

## Consequences

**Positive**

- A broker outage leaves the outbox row to retry. The User still gets the write result.
- Feed invalidation and the socket push share one event.

**Negative**

- Live p95 includes worker lag. SAD §11 alerts when the oldest unpublished row is older than 500 ms.

**Neutral**

- The view-flush worker in ADR 0012 is a different process. It does not publish the outbox.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §7
- Related ADR: [[0002-append-staff-audit-in-users-schema.md]]
