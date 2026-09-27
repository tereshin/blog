---
status: Accepted
owner: "Architect"
reviewers: []
updated_at: "2026-09-27"
feature_size: "XL"
ticket: ""
---

# 0009 — Count rate limits with a sliding window

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Architect and the repository owner (easy-depth ledger accepted)

## Context

Repeat writes are slowed per User, and anonymous reads are slowed per visitor. An Administrator can change the limits. The gateway is the place that sees every public call.

## Decision drivers

- The spec states the limits as counts per minute or per hour (spec §6.1).
- Anonymous reads are slowed per visitor. The accepted default is 60 per minute (spec §8, closed in this pass).
- Limits must be changeable without a schema migration.

## Considered options

1. **A Redis sliding window at the gateway.** The window is the last minute (or the last hour for images) and moves with the request.
2. **A fixed window.** A counter resets on the clock minute.
3. **A token bucket.** Tokens refill continuously up to a burst.

## Decision outcome

**Chosen:** Option 1. The spec's numbers are counts per minute, and a sliding window measures that interval. Option 2 allows two bursts on either side of the minute. Option 3 answers a burst question the spec does not ask.

## Consequences

**Positive**

- Changing a limit is a settings write, which the spec already gives the Administrator.
- One implementation covers writes and anonymous reads.

**Negative**

- A sliding window stores more than one timestamp per visitor. The key lives in Redis and expires with the window.

**Neutral**

- Admin routes keep their own stricter limits on the same helper. The numbers for those stricter limits are an admin setting, not a second algorithm.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §8
- Related ADR: [[0003-compose-public-article-read-in-gateway.md]]
