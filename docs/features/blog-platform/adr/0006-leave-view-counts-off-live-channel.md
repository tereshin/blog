---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0006 — Leave view counts off the live channel

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

An open Article must show a new Like count, a Comment count change, a new or hidden Comment, or a hide without a reload. The same paragraph of the spec says the View count does not have to change on that open view. The brief suggested pushing an aggregated View tick every few seconds.

## Decision drivers

- Live-update p95 ≤ 500 ms from the action being recorded to the open Article view changing (spec §6).
- The View count is outside that live update (spec AC-25).
- A popular Article would emit a View tick far more often than a Like.

## Considered options

1. **Push Likes, Comments, and hides only.** The open Article does not subscribe to View ticks. The durable View count is read with the next Article load.
2. **Also push an aggregated View count** every few seconds on the Article room.

## Decision outcome

**Chosen:** Option 1. The 500 ms channel stays for the events the spec puts on the open view. Option 2 spends that channel on a counter the open view is allowed to leave stale.

## Consequences

**Positive**

- A viral Article does not flood the room with View ticks.
- The live budget is spent on hide and Comment, which readers must see quickly.

**Negative**

- Someone watching an Article does not see the View count climb until they load it again.

**Neutral**

- Counting and flushing still happen (ADR 0012). This decision is only about the socket.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0012-flush-view-increments-from-redis.md]]
