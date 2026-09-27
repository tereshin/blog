---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0012 — Flush view increments from Redis

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

A View is counted when an Article stays visible, and the same viewer does not count again for 30 minutes. Doing a Postgres update on every view would put a write on the read path of a popular Article. The open page does not need the new total immediately (ADR 0006).

## Decision drivers

- Same-viewer View window of 30 minutes (spec §6).
- A View counts after 3 seconds of visibility. That figure is the spec §8 default accepted in this pass.
- A Guest is the same viewer for the same browser session. A User is the same viewer when that User returns (spec AC-02).
- Cached Article read p95 ≤ 100 ms (spec §6).

## Considered options

1. **Redis increment plus a flush worker.** Redis holds the dedupe key for 30 minutes and the increment. An engagement worker adds the delta to the Postgres count.
2. **Add the unflushed Redis delta on every Article read.** Postgres stores the last flush, and the read adds whatever Redis still holds. There is no flush worker.

## Decision outcome

**Chosen:** Option 1. After a flush, a cached Article read does not need Redis to show the stored count. Option 2 puts Redis on every Article read, including the 100 ms cached path.

## Consequences

**Positive**

- The read path stays a Postgres count plus the feed cache.
- Dedupe for a Guest is a signed browser session key, and for a User it is the user id. Both fit the same Redis key shape.

**Negative**

- Increments that have not been flushed are lost if Redis dies first. SAD §11 accepts a short flush interval and Redis persistence as the mitigation.

**Neutral**

- The 3 second dwell is enforced by the client before it asks to record a View, and the engagement service rejects a repeat inside the 30 minute window.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §8
- Related ADR: [[0006-leave-view-counts-off-live-channel.md]]
